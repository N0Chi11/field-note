export interface GiftCamera {
  id: string
  brand: string
  model: string
  kind: string
  photo: string
  official: string
}

function camera(id: string, brand: string, model: string, kind: string, official: string): GiftCamera {
  return { id, brand, model, kind, photo: `/assets/camera-prizes/${id}.webp`, official }
}

export const GIFT_CAMERAS: readonly GiftCamera[] = [
  camera('hasselblad-x2d-ii-100c', 'Hasselblad', 'X2D II 100C', '中画幅无反', 'https://store-na.hasselblad.com/products/x2d-ii-100c'),
  camera('leica-m11', 'Leica', 'M11', '全画幅旁轴', 'https://leica-camera.com/en-US/photography/cameras/m/m11-black'),
  camera('fujifilm-gfx100-ii', 'Fujifilm', 'GFX100 II', '中画幅无反', 'https://www.fujifilm-x.com/global/products/cameras/gfx100-ii/'),
  camera('canon-eos-r1', 'Canon', 'EOS R1', '全画幅无反', 'https://www.canon-europe.com/cameras/eos-r1/'),
  camera('sony-a1-ii', 'Sony', 'α1 II', '全画幅无反', 'https://alphauniverse.com/cameras/alpha-1-ii/'),
  camera('nikon-z9', 'Nikon', 'Z 9', '全画幅无反', 'https://imaging.nikon.com/imaging/lineup/mirrorless/z_9/'),
  camera('leica-q3-43', 'Leica', 'Q3 43', '全画幅定焦', 'https://leica-camera.com/en-US/photography/cameras/q/q3-43-black'),
  camera('hasselblad-907x-cfv-100c', 'Hasselblad', '907X & CFV 100C', '中画幅无反', 'https://store-na.hasselblad.com/products/907x-cfv-100c'),
  camera('fujifilm-gfx100rf', 'Fujifilm', 'GFX100RF', '中画幅定焦', 'https://www.fujifilm-x.com/global/products/cameras/gfx100rf/'),
  camera('canon-eos-r5-mark-ii', 'Canon', 'EOS R5 Mark II', '全画幅无反', 'https://www.canon-europe.com/cameras/eos-r5-mark-ii/'),
  camera('sony-a9-iii', 'Sony', 'α9 III', '全画幅无反', 'https://alphauniverse.com/cameras/alpha-9-iii/'),
  camera('nikon-z8', 'Nikon', 'Z 8', '全画幅无反', 'https://imaging.nikon.com/imaging/lineup/mirrorless/z_8/'),
  camera('leica-sl3', 'Leica', 'SL3', '全画幅无反', 'https://leica-camera.com/en-US/photography/cameras/sl/sl3-black'),
  camera('fujifilm-gfx100s-ii', 'Fujifilm', 'GFX100S II', '中画幅无反', 'https://www.fujifilm-x.com/global/products/cameras/gfx100s-ii/'),
  camera('panasonic-lumix-s1rii', 'Panasonic', 'LUMIX S1RII', '全画幅无反', 'https://shop.panasonic.com/pages/lumix-s1rii-full-frame-mirrorless-camera')
]
