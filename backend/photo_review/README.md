# Photo review service

This directory contains the cloud-review components of “你拍的照片怎么样” 0.2.2, integrated into FIELD NOTE. It is served only through the main application's admin route and the internal Docker network; it is not a standalone public service.

Uploaded photo copies and review results live in the `photo_review_data` Docker volume. No user photo library or API key is included in this source tree. Administrators explicitly start Kimi review from the interface; API keys remain in the service process memory.

Deployment and data-retention notes: [`deploy/PHOTO_REVIEW_SETUP.md`](../../deploy/PHOTO_REVIEW_SETUP.md).
