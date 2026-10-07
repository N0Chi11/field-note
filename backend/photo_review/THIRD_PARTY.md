# Third-party notices

《你拍的照片怎么样》 uses separately installed Python packages. The cloud launcher installs NumPy, Pillow, pillow-heif, and OpenCV headless. Each distribution retains its own license and notices.

- Python: PSF License, https://www.python.org/psf/license/ . The Windows launcher downloads the official embedded distribution with its included license file.
- NumPy: BSD license; Pillow: HPND license; pillow-heif: BSD-3-Clause; OpenCV: Apache-2.0. Installed distributions include their licenses.
- YuNet face locator: MIT License, copyright (c) 2020 Shiqi Yu. The small OpenCV Zoo model is included in `assets/face_detection_yunet_2023mar.onnx`, solely to locate face crops. Its license is in `LICENSES/YuNet-MIT.txt`. Source: https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet . It does not make eye-state or photographic-quality decisions.
- Kimi K3, K2.6, and K2.7 Code (including the highspeed variant) are called through the user's Kimi API account. No Kimi weights or credentials are included. Service terms and billing apply: https://platform.kimi.com/docs/models .

Legacy optional local inference code remains in `engine.py` and the old dependency list. Its public components are OpenCLIP/OpenAI CLIP (MIT), LAION Aesthetics Predictor V1 (MIT), MediaPipe (Apache-2.0), PyTorch/torchvision (BSD-style), timm and Hugging Face Hub (Apache-2.0). These legacy model weights and installed environments are not included in the source package and are not loaded by the cloud review path.

Apache-2.0 license text is included at `LICENSES/Apache-2.0.txt`.
