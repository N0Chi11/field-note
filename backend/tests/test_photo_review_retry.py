import io
import sys
import unittest
import urllib.error
from email.message import Message
from pathlib import Path
from unittest.mock import MagicMock, patch


PHOTO_REVIEW_DIR = Path(__file__).resolve().parents[1] / 'photo_review'
if str(PHOTO_REVIEW_DIR) not in sys.path:
    sys.path.append(str(PHOTO_REVIEW_DIR))

from cloud_review import CloudReviewError, api_request


def http_error(code, retry_after='0'):
    headers = Message()
    if retry_after is not None:
        headers['Retry-After'] = retry_after
    return urllib.error.HTTPError(
        'https://api.moonshot.cn/v1/models', code, 'temporary error', headers, io.BytesIO()
    )


class PhotoReviewRetryTests(unittest.TestCase):
    def test_retries_rate_limit_and_server_errors_then_succeeds(self):
        opener = MagicMock()
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'{"data": []}'
        opener.open.side_effect = [http_error(429), http_error(503), response]

        with patch('cloud_review.urllib.request.build_opener', return_value=opener), \
             patch('cloud_review.time.sleep') as sleep, \
             patch('cloud_review.random.uniform', return_value=0):
            result = api_request({'region': 'cn'}, 'test-key', 'models')

        self.assertEqual(result, {'data': []})
        self.assertEqual(opener.open.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    def test_stops_after_three_retries_with_clear_rate_limit_error(self):
        opener = MagicMock()
        opener.open.side_effect = [http_error(429) for _ in range(4)]

        with patch('cloud_review.urllib.request.build_opener', return_value=opener), \
             patch('cloud_review.time.sleep') as sleep, \
             patch('cloud_review.random.uniform', return_value=0):
            with self.assertRaisesRegex(CloudReviewError, '自动重试后仍未成功'):
                api_request({'region': 'cn'}, 'test-key', 'models')

        self.assertEqual(opener.open.call_count, 4)
        self.assertEqual(sleep.call_count, 3)

    def test_does_not_repeat_a_request_after_network_timeout(self):
        opener = MagicMock()
        opener.open.side_effect = urllib.error.URLError('timeout')

        with patch('cloud_review.urllib.request.build_opener', return_value=opener), \
             patch('cloud_review.time.sleep') as sleep:
            with self.assertRaisesRegex(CloudReviewError, '不自动重复请求'):
                api_request({'region': 'cn'}, 'test-key', 'models')

        self.assertEqual(opener.open.call_count, 1)
        sleep.assert_not_called()


if __name__ == '__main__':
    unittest.main()
