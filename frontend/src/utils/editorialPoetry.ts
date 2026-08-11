export interface EditorialPoem {
  id: string
  title: string
  author: string
  lines: readonly [string, string, string]
}

/**
 * Original Chinese renderings of public-domain excerpts by classic European
 * and American poets. They are intentionally set as three-line fragments for
 * the editorial layout and do not reuse a published Chinese translation.
 */
export const EDITORIAL_POEMS: readonly EditorialPoem[] = [
  {
    id: 'shakespeare-summer',
    author: 'William Shakespeare',
    title: 'Sonnet 18',
    lines: ['可否将你比作夏日？', '你却比夏日更温柔，也更可爱', '狂风会摇落五月心爱的花蕾']
  },
  {
    id: 'shakespeare-love',
    author: 'William Shakespeare',
    title: 'Sonnet 116',
    lines: ['不要为两颗真心的结合设置阻碍', '爱若会随改变而改变', '那便从来不曾是爱']
  },
  {
    id: 'blake-infinity',
    author: 'William Blake',
    title: 'Auguries of Innocence',
    lines: ['从一粒沙里看见世界', '从一朵野花里看见天堂', '把无穷握在你的掌心']
  },
  {
    id: 'byron-beauty',
    author: 'Lord Byron',
    title: 'She Walks in Beauty',
    lines: ['她行走在美之中，如夜色', '晴朗无云，繁星满天', '明与暗最好的部分在她身上相逢']
  },
  {
    id: 'shelley-west-wind',
    author: 'Percy Bysshe Shelley',
    title: 'Ode to the West Wind',
    lines: ['狂野的西风，秋日生命的呼吸', '你尚未现身，枯叶便四散奔逃', '如幽灵躲避施法的巫师']
  },
  {
    id: 'keats-bright-star',
    author: 'John Keats',
    title: 'Bright Star',
    lines: ['明亮的星，我愿如你坚定', '却不愿孤悬于高高的夜空', '永远睁着不眠的眼睛']
  },
  {
    id: 'dickinson-hope',
    author: 'Emily Dickinson',
    title: 'Hope is the Thing with Feathers',
    lines: ['希望，是长着羽毛的事物', '它栖息在灵魂深处', '唱着没有歌词的曲调']
  },
  {
    id: 'whitman-self',
    author: 'Walt Whitman',
    title: 'Song of Myself',
    lines: ['我赞美自己，也歌唱自己', '我所承认的，你也将承认', '因为我的每一粒原子也同样属于你']
  },
  {
    id: 'poe-dream',
    author: 'Edgar Allan Poe',
    title: 'A Dream Within a Dream',
    lines: ['请收下落在额头的这一吻', '在此刻与你告别以前', '让我承认：一切不过是梦中之梦']
  },
  {
    id: 'wordsworth-cloud',
    author: 'William Wordsworth',
    title: 'I Wandered Lonely as a Cloud',
    lines: ['我独自漫游，像一朵云', '高高飘过山谷与丘陵', '忽然看见一片金色的水仙']
  },
  {
    id: 'frost-road',
    author: 'Robert Frost',
    title: 'The Road Not Taken',
    lines: ['两条路在黄色的树林里分岔', '遗憾我不能同时走过它们', '作为一个旅人，我久久伫立']
  },
  {
    id: 'yeats-cloths',
    author: 'W. B. Yeats',
    title: 'The Cloths of Heaven',
    lines: ['倘若我有天空织就的锦缎', '绣满金色与银色的光', '还有幽蓝、黯淡与深黑的夜']
  },
  {
    id: 'rossetti-song',
    author: 'Christina Rossetti',
    title: 'Song',
    lines: ['当我死去，我最亲爱的人', '不要为我唱悲伤的歌', '也不要在我头顶栽种玫瑰']
  },
  {
    id: 'browning-love',
    author: 'Elizabeth Barrett Browning',
    title: 'Sonnet 43',
    lines: ['我怎样爱你？让我细数', '我爱你，直到灵魂所能抵达的', '最深、最广与最高之处']
  },
  {
    id: 'longfellow-life',
    author: 'Henry Wadsworth Longfellow',
    title: 'A Psalm of Life',
    lines: ['不要用悲伤的数字告诉我', '生命不过是一场空梦', '沉睡的灵魂才真正死去']
  },
  {
    id: 'wilde-love',
    author: 'Oscar Wilde',
    title: 'The Ballad of Reading Gaol',
    lines: ['每个人都会杀死自己所爱之物', '让所有人都听见这句话', '有人用冷酷的一瞥完成它']
  },
  {
    id: 'baudelaire-correspondences',
    author: 'Charles Baudelaire',
    title: 'Correspondances',
    lines: ['自然是一座神殿，活的柱石', '偶尔吐露含混的言语', '人穿行于象征的森林']
  },
  {
    id: 'rimbaud-sensation',
    author: 'Arthur Rimbaud',
    title: 'Sensation',
    lines: ['在夏日蔚蓝的黄昏，我将走上小径', '让麦芒轻刺，让细草触碰脚底', '做梦的人，感受清凉沿双足升起']
  },
  {
    id: 'pessoa-pretender',
    author: 'Fernando Pessoa',
    title: 'Autopsychography',
    lines: ['诗人是一个善于假装的人', '他把假装做得如此彻底', '甚至把真实的痛也写成另一种痛']
  }
]

const LAST_POEM_KEY = 'equipment-editorial-last-poem'
let poemForThisPage: EditorialPoem | undefined

function randomIndex(max: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] % max
  }
  return Math.floor(Math.random() * max)
}

/** Pick once per page load and avoid repeating the previous page's poem. */
export function getEditorialPoem(): EditorialPoem {
  if (poemForThisPage) return poemForThisPage

  let lastId = ''
  try {
    lastId = window.localStorage.getItem(LAST_POEM_KEY) || ''
  } catch {
    // Storage can be unavailable in privacy mode; randomness still works.
  }

  const candidates = EDITORIAL_POEMS.filter(poem => poem.id !== lastId)
  poemForThisPage = candidates[randomIndex(candidates.length)]

  try {
    window.localStorage.setItem(LAST_POEM_KEY, poemForThisPage.id)
  } catch {
    // The poem is decorative, so storage failures are intentionally ignored.
  }
  return poemForThisPage
}
