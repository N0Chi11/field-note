import sys
import unittest
from pathlib import Path

PHOTO_REVIEW_DIR = Path(__file__).resolve().parents[1] / 'photo_review'
if str(PHOTO_REVIEW_DIR) not in sys.path:
    sys.path.append(str(PHOTO_REVIEW_DIR))

from selection import group_candidates


def photo(name, vector, timestamp, perceptual_hash):
    return {
        'name': name,
        'taken_at': timestamp,
        'grouping': {
            'embedding': vector,
            'visual_model': 'scene-layout-v2',
            'perceptual_hash': perceptual_hash,
            'taken_at': timestamp,
        },
    }


class BurstGroupingTests(unittest.TestCase):
    def test_relaxes_similarity_for_close_burst_frames(self):
        first = photo('a.jpg', [1, 0], 1000, '0000000000000000')
        second = photo('b.jpg', [.8, .6], 1001, '0000000000000000')
        groups = group_candidates([first, second], threshold=.92)
        self.assertEqual([[p['name'] for p in group] for group in groups], [['a.jpg', 'b.jpg']])

    def test_nearby_perceptual_hash_can_join_a_burst(self):
        first = photo('a.jpg', [1, 0], 1000, '0000000000000000')
        second = photo('b.jpg', [0, 1], 1002, '0000000000000003')
        groups = group_candidates([first, second], threshold=.92)
        self.assertEqual(len(groups), 1)

    def test_visual_similarity_still_separates_unrelated_frames(self):
        first = photo('a.jpg', [1, 0], 1000, '0000000000000000')
        second = photo('b.jpg', [0, 1], 1001, 'ffffffffffffffff')
        groups = group_candidates([first, second], threshold=.92)
        self.assertEqual(len(groups), 2)

    def test_short_window_and_scene_similarity_are_both_required(self):
        first = photo('a.jpg', [1, 0], 1000, '0000000000000000')
        second = photo('b.jpg', [.8, .6], 1013, '0000000000000000')
        groups = group_candidates([first, second], threshold=.92)
        self.assertEqual(len(groups), 2)

    def test_distant_captures_never_merge_even_if_pixels_match(self):
        first = photo('a.jpg', [1, 0], 1000, '0000000000000000')
        second = photo('b.jpg', [1, 0], 1400, '0000000000000000')
        groups = group_candidates([first, second], threshold=.92)
        self.assertEqual(len(groups), 2)


if __name__ == '__main__':
    unittest.main()
