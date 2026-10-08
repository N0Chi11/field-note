import importlib.util
import os
import sys
import tempfile
import threading
import time
import types
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch


PHOTO_REVIEW_DIR = Path(__file__).resolve().parents[1] / 'photo_review'
if str(PHOTO_REVIEW_DIR) not in sys.path:
    sys.path.append(str(PHOTO_REVIEW_DIR))

# python-jose is part of the deployed backend requirements. The workspace
# isolation tests do not exercise JWT decoding, so permit a minimal local stub
# in lightweight test environments where that dependency is not installed.
if importlib.util.find_spec('jose') is None:
    jose = types.ModuleType('jose')
    jose.JWTError = type('JWTError', (Exception,), {})
    jose.jwt = types.SimpleNamespace()
    sys.modules['jose'] = jose

APP_SPEC = importlib.util.spec_from_file_location('field_note_photo_review_app', PHOTO_REVIEW_DIR / 'app.py')
photo_review_app = importlib.util.module_from_spec(APP_SPEC)
sys.modules[APP_SPEC.name] = photo_review_app
APP_SPEC.loader.exec_module(photo_review_app)
CLOUD_REVIEW_SLOTS = photo_review_app.CLOUD_REVIEW_SLOTS
Handler = photo_review_app.Handler
PhotoReviewServer = photo_review_app.PhotoReviewServer
Workspace = photo_review_app.Workspace


class PhotoReviewIsolationTests(unittest.TestCase):
    def test_each_admin_gets_a_distinct_persistent_workspace(self):
        with tempfile.TemporaryDirectory() as directory:
            data_root = Path(directory) / 'review-data'
            server = PhotoReviewServer(('127.0.0.1', 0), Handler, data_root, user_scoped=True)
            try:
                alice = server.workspace_for('101')
                bob = server.workspace_for('202')
                alice.photos['private-photo'] = {'id': 'private-photo', 'metrics': None}

                self.assertIsNot(alice, bob)
                self.assertNotEqual(alice.data, bob.data)
                self.assertIn('private-photo', alice.photos)
                self.assertNotIn('private-photo', bob.photos)
                self.assertEqual(alice.db_path, data_root / 'users' / '101' / 'liuguang.sqlite')
                self.assertEqual(bob.db_path, data_root / 'users' / '202' / 'liuguang.sqlite')
            finally:
                server.stop_workspaces()
                server.server_close()
                server._workspaces.clear()

    def test_owner_id_cannot_be_used_as_a_filesystem_path(self):
        with tempfile.TemporaryDirectory() as directory:
            server = PhotoReviewServer(('127.0.0.1', 0), Handler, directory, user_scoped=True)
            try:
                with self.assertRaises(PermissionError):
                    server.workspace_for('../someone-else')
            finally:
                server.stop_workspaces()
                server.server_close()
                server._workspaces.clear()

    def test_request_workspace_is_selected_from_signed_admin_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            server = PhotoReviewServer(('127.0.0.1', 0), Handler, directory, user_scoped=True)
            handler = Handler.__new__(Handler)
            handler.headers = Message()
            handler.headers['Cookie'] = 'photo_review_session=signed-session'
            handler.server = server
            env = {
                'PHOTO_REVIEW_REQUIRE_ADMIN_SESSION': '1',
                'PHOTO_REVIEW_SESSION_SECRET': 'x' * 64,
            }
            try:
                with patch.dict(os.environ, env):
                    with patch.object(photo_review_app.jwt, 'decode', create=True, return_value={
                        'sub': '101', 'role': 'admin', 'type': 'photo_review_session'
                    }):
                        alice = handler.workspace()
                    with patch.object(photo_review_app.jwt, 'decode', create=True, return_value={
                        'sub': '202', 'role': 'admin', 'type': 'photo_review_session'
                    }):
                        bob = handler.workspace()
                self.assertIsNot(alice, bob)
                self.assertEqual(alice.data.name, '101')
                self.assertEqual(bob.data.name, '202')
            finally:
                server.stop_workspaces()
                server.server_close()
                server._workspaces.clear()

    def test_cloud_review_uses_four_workers_and_persists_groups_once(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Workspace(data_root=directory)
            workspace.preparer = object()
            workspace.job.update(state='running',submitted=0,reused=0,prompt_tokens=0,completion_tokens=0)
            ids = [f'photo-{index}' for index in range(8)]
            workspace.photos = {
                pid: {'id': pid, 'name': pid, 'path': pid, 'cache_key': pid,
                      'metrics': None, 'status': 'pending', 'manual': None}
                for pid in ids
            }
            active = 0
            max_active = 0
            active_lock = threading.Lock()

            def fake_review(pid, reviewer, mode):
                nonlocal active, max_active
                with active_lock:
                    active += 1
                    max_active = max(max_active, active)
                time.sleep(.05)
                with active_lock:
                    active -= 1
                return {'pid': pid, 'metrics': {}, 'reused': False}

            class FakeReviewer:
                def __init__(self, config, api_key):
                    self.signature = 'test-signature'
                    self.device_name = 'test'

            with patch.dict(os.environ, {'PHOTO_REVIEW_CONCURRENCY': '4'}):
                with patch.object(photo_review_app, 'KimiReviewer', FakeReviewer), \
                     patch.object(workspace, '_review_cloud_photo', side_effect=fake_review), \
                     patch.object(workspace, 'update_cloud_groups', wraps=workspace.update_cloud_groups) as regroup, \
                     patch.object(workspace, 'persist_all', wraps=workspace.persist_all) as persist:
                    workspace.work_cloud(ids, {'model': 'kimi-k2.6'}, 'test-key', 'event')

            self.assertEqual(max_active, 4)
            self.assertEqual(regroup.call_count, 1)
            self.assertEqual(persist.call_count, 1)
            self.assertEqual(workspace.job['done'], len(ids))

    def test_server_wide_review_limit_is_four(self):
        acquired = [CLOUD_REVIEW_SLOTS.acquire(blocking=False) for _ in range(5)]
        try:
            self.assertEqual(sum(acquired), 4)
        finally:
            for did_acquire in acquired:
                if did_acquire:
                    CLOUD_REVIEW_SLOTS.release()


if __name__ == '__main__':
    unittest.main()
