export interface GiftCamera {
  id: string
  brand: string
  model: string
  kind: string
  photo: string
  author: string
  source: string
  license: string
  licenseUrl: string
  official: string
}

export const GIFT_CAMERAS: readonly GiftCamera[] = [
  {
    id: 'hasselblad-h6d-100c',
    brand: 'Hasselblad',
    model: 'H6D-100c',
    kind: '中画幅单反',
    photo: '/assets/christmas-gifts/hasselblad-h6d-100c.webp',
    author: 'Ida Gustaf',
    source: 'https://commons.wikimedia.org/wiki/File:Hasselblad-H6D-100c_front-shot_WH1_(cropped).jpg',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    official: 'https://www.hasselblad.com/h-system/h6d-100c/'
  },
  {
    id: 'leica-m11',
    brand: 'Leica',
    model: 'M11',
    kind: '全画幅旁轴',
    photo: '/assets/christmas-gifts/leica-m11.webp',
    author: 'Henry Söderlund',
    source: 'https://commons.wikimedia.org/wiki/File:Leica_M11_-_by_Henry_S%C3%B6derlund_(52659157434).jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    official: 'https://leica-camera.com/en-US/photography/cameras/m/m11-black'
  },
  {
    id: 'fujifilm-gfx100-ii',
    brand: 'Fujifilm',
    model: 'GFX100 II',
    kind: '中画幅无反',
    photo: '/assets/christmas-gifts/fujifilm-gfx100-ii.webp',
    author: '昼落ち',
    source: 'https://commons.wikimedia.org/wiki/File:Fujifilm_GFX100_II_2_dec_2023a.jpg',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    official: 'https://www.fujifilm-x.com/global/products/cameras/gfx100-ii/'
  },
  {
    id: 'canon-eos-r1',
    brand: 'Canon',
    model: 'EOS R1',
    kind: '全画幅旗舰',
    photo: '/assets/christmas-gifts/canon-eos-r1.webp',
    author: 'Dinkun Chen',
    source: 'https://commons.wikimedia.org/wiki/File:Canon_EOS_R1%2BRF_24-105mm_F2.8L_IS_USM_Z.jpg',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    official: 'https://www.canon-europe.com/cameras/eos-r1/'
  }
]
