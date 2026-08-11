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
  },
  {
    id: 'donne-sun-rising',
    author: 'John Donne',
    title: 'The Sun Rising',
    lines: ['忙碌而年迈的太阳，你为何这样', '穿过窗与帘，来召唤我们', '难道爱人的季节也听从你的运转']
  },
  {
    id: 'marvell-coy-mistress',
    author: 'Andrew Marvell',
    title: 'To His Coy Mistress',
    lines: ['如果我们拥有足够的世界与时间', '这份羞怯，姑娘，便不算罪过', '我们可以坐下，选择向哪边漫步']
  },
  {
    id: 'milton-mind',
    author: 'John Milton',
    title: 'Paradise Lost',
    lines: ['心自成一方天地', '它能把地狱变成天堂', '也能把天堂变成地狱']
  },
  {
    id: 'coleridge-xanadu',
    author: 'Samuel Taylor Coleridge',
    title: 'Kubla Khan',
    lines: ['在上都，忽必烈下令建造', '一座庄严的欢乐宫殿', '神圣的阿尔河在那里奔流']
  },
  {
    id: 'tennyson-newer-world',
    author: 'Alfred, Lord Tennyson',
    title: 'Ulysses',
    lines: ['来吧，我的朋友', '去寻找一个更新的世界还不算太迟', '推开船，让整齐的桨击打海水']
  },
  {
    id: 'arnold-dover',
    author: 'Matthew Arnold',
    title: 'Dover Beach',
    lines: ['今夜的海很平静', '潮水正满，月亮安静地躺在海峡上', '法国海岸的灯光忽明忽灭']
  },
  {
    id: 'hopkins-pied-beauty',
    author: 'Gerard Manley Hopkins',
    title: 'Pied Beauty',
    lines: ['愿荣耀归于上帝，为一切斑斓之物', '为像花斑母牛一样双色的天空', '为游鳟身上玫瑰色的斑点']
  },
  {
    id: 'hardy-darkling-thrush',
    author: 'Thomas Hardy',
    title: 'The Darkling Thrush',
    lines: ['我倚在灌木丛生的门前', '寒霜是幽灵般的灰', '冬日的沉渣使白昼荒凉']
  },
  {
    id: 'housman-cherry',
    author: 'A. E. Housman',
    title: 'Loveliest of Trees',
    lines: ['最可爱的树，樱桃此刻', '沿着林间小径挂满花朵', '穿着白衣迎接复活节']
  },
  {
    id: 'rilke-apollo',
    author: 'Rainer Maria Rilke',
    title: 'Archaic Torso of Apollo',
    lines: ['我们未曾见过他不可思议的头颅', '双眼曾在其中成熟', '但他的躯干仍像枝形灯般燃烧']
  },
  {
    id: 'goethe-night-song',
    author: 'Johann Wolfgang von Goethe',
    title: "Wanderer's Nightsong II",
    lines: ['群峰之上', '是一片安静', '树梢之间几乎感不到一丝风']
  },
  {
    id: 'heine-pine',
    author: 'Heinrich Heine',
    title: 'A Pine Tree Stands Lonely',
    lines: ['一棵松树孤独地站在北方', '站在高高的荒岭上', '冰雪用白色的毯子将它包裹']
  },
  {
    id: 'novalis-night',
    author: 'Novalis',
    title: 'Hymns to the Night',
    lines: ['我转身投向神圣而不可言说的夜', '世界躺得很远', '沉入一座深深的墓穴']
  },
  {
    id: 'holderlin-half-life',
    author: 'Friedrich Hölderlin',
    title: 'Half of Life',
    lines: ['大地挂满黄梨', '也挂满野玫瑰', '你们美丽的天鹅沉醉于亲吻']
  },
  {
    id: 'pushkin-winter',
    author: 'Alexander Pushkin',
    title: 'Winter Evening',
    lines: ['风暴用雾遮住天空', '旋转着狂野的雪', '时而像野兽咆哮']
  },
  {
    id: 'lermontov-sail',
    author: 'Mikhail Lermontov',
    title: 'The Sail',
    lines: ['孤独的白帆闪耀', '在蓝色海雾里', '它在遥远的国度寻找什么']
  },
  {
    id: 'dante-dark-wood',
    author: 'Dante Alighieri',
    title: 'Inferno, Canto I',
    lines: ['在人生旅途的中途', '我发现自己置身于幽暗森林', '因为笔直的道路已经失落']
  },
  {
    id: 'petrarch-golden-hair',
    author: 'Francesco Petrarca',
    title: 'Canzoniere 90',
    lines: ['她曾让金色的头发随风飘散', '那头发缠成千百甜蜜的结', '眼里的光燃烧得不可估量']
  },
  {
    id: 'leopardi-infinite',
    author: 'Giacomo Leopardi',
    title: "L'Infinito",
    lines: ['这座孤独的小丘一直令我亲切', '还有这道树篱', '它遮住远处大半的地平线']
  },
  {
    id: 'rossetti-echo',
    author: 'Christina Rossetti',
    title: 'Echo',
    lines: ['来吧，在寂静中回到我身边', '来吧，如记忆一般', '如从前那样，迟来的，冰冷的']
  },
  {
    id: 'browning-meeting',
    author: 'Robert Browning',
    title: 'Meeting at Night',
    lines: ['灰色的海，漫长的黑色陆地', '黄色的半月又低又大', '受惊的小浪跃成火焰般的发卷']
  },
  {
    id: 'dickinson-frigate',
    author: 'Emily Dickinson',
    title: 'There Is No Frigate like a Book',
    lines: ['没有哪艘战舰能像一本书', '把我们带往遥远的国度', '也没有骏马能像一页跃动的诗']
  },
  {
    id: 'whitman-captain',
    author: 'Walt Whitman',
    title: 'O Captain! My Captain!',
    lines: ['哦，船长，我的船长', '我们可怕的航程已经结束', '船已渡过每一道险关']
  },
  {
    id: 'poe-annabel-lee',
    author: 'Edgar Allan Poe',
    title: 'Annabel Lee',
    lines: ['许多许多年前', '在海边的一个王国里', '住着一位名叫安娜贝尔·李的少女']
  },
  {
    id: 'blake-tyger',
    author: 'William Blake',
    title: 'The Tyger',
    lines: ['老虎，老虎，燃烧得明亮', '在黑夜的森林里', '怎样不朽的手与眼塑造你可怖的匀称']
  },
  {
    id: 'shelley-skylark',
    author: 'Percy Bysshe Shelley',
    title: 'To a Skylark',
    lines: ['向你致敬，欢乐的精灵', '你从来不像一只鸟', '从天堂附近倾泻完整的心']
  },
  {
    id: 'keats-nightingale',
    author: 'John Keats',
    title: 'Ode to a Nightingale',
    lines: ['我的心在疼，一种昏沉的麻木', '刺痛我的感官', '仿佛我刚刚饮下毒芹']
  },
  {
    id: 'byron-solitude',
    author: 'Lord Byron',
    title: "Childe Harold's Pilgrimage",
    lines: ['有一种快乐，在无路的树林', '有一种狂喜，在孤独的海岸', '有人群无法闯入的社会，在深海旁']
  },
  {
    id: 'yeats-innisfree',
    author: 'W. B. Yeats',
    title: 'The Lake Isle of Innisfree',
    lines: ['现在我要起身，去往茵尼斯弗里', '在那里建一间小屋', '用泥土与细枝筑成']
  },
  {
    id: 'longfellow-rainy-day',
    author: 'Henry Wadsworth Longfellow',
    title: 'The Rainy Day',
    lines: ['白日寒冷、黑暗而阴沉', '雨落着，风从不疲倦', '藤蔓仍攀附在朽坏的墙上']
  },
  {
    id: 'frost-woods',
    author: 'Robert Frost',
    title: 'Stopping by Woods on a Snowy Evening',
    lines: ['我想我知道这片树林属于谁', '他的房子却在村庄里', '他不会看见我停在这里']
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
