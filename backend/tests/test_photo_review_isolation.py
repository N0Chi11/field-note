import importlib.util
import os
import sys
import tempfile
import types
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch


PHOTO_REVIEW_DIR = Path(__file__).resolve().parents[1] / 'photo_review'
if str(PHOTO_REVIEW_DIR) not in sys.path:
    sys.path.insert(0, str(PHOTO_REVIEW_DIR))

# python-jose is part of the deployed backend requirements. The workspace
# isolation tests do not exercise JWT decoding, so permit a minimal local stub
# in lightweight test environments where that dependency is not installed.
if importlib.util.find_spec('jose') is None:
    jose = types.ModuleType('jose')
    jose.JWTError = type('JWTError', (Exception,), {})
    jose.jwt = types.SimpleNamespace()
    sys.modules['jose'] = jose

from app import Handler, PhotoReviewServer


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
                    with patch('app.jwt.decode', create=True, return_value={
                        'sub': '101', 'role': 'admin', 'type': 'photo_review_session'
                    }):
                        alice = handler.workspace()
                    with patch('app.jwt.decode', create=True, return_value={
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


if __name__ == '__main__':
    unittest.main()
