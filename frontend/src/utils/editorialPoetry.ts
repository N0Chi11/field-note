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
const CORE_EDITORIAL_POEMS: readonly EditorialPoem[] = [
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

/** A longer shelf of public-domain poetry, rendered as original Chinese three-line fragments. */
const EXTENDED_EDITORIAL_POEMS: readonly EditorialPoem[] = [
  { id: 'shakespeare-time', author: 'William Shakespeare', title: 'Sonnet 60', lines: ['如浪潮奔向卵石的海岸', '我们的分钟也赶向终点', '每一次更替都在前一刻之后'] },
  { id: 'spenser-prothalamion', author: 'Edmund Spenser', title: 'Prothalamion', lines: ['甜蜜的泰晤士河，请轻轻流淌', '直到我唱完这一支歌', '愿水面替恋人收藏光亮'] },
  { id: 'herbert-pulley', author: 'George Herbert', title: 'The Pulley', lines: ['上天把祝福倾进人的杯中', '力量、愉悦与美都在其中', '唯独安歇，被留在天上'] },
  { id: 'marvell-garden', author: 'Andrew Marvell', title: 'The Garden', lines: ['多么甜美的安息藏在树荫里', '爱与名声都退到远处', '绿色的思想在绿色的阴影中'] },
  { id: 'pope-essay', author: 'Alexander Pope', title: 'An Essay on Man', lines: ['人的自知何其有限', '他站在世界中央却看不见尺度', '像一只虫，揣测天使的意图'] },
  { id: 'gray-elegy', author: 'Thomas Gray', title: 'Elegy Written in a Country Churchyard', lines: ['暮色的钟声缓缓敲向白昼', '牛群穿过草地回到栏中', '世界把一切交给我独处'] },
  { id: 'collins-ode', author: 'William Collins', title: 'Ode to Evening', lines: ['若你愿意，请来吧，温柔的黄昏', '披着褐色的斗篷与灰色的面纱', '让山谷学会宁静'] },
  { id: 'burns-red-rose', author: 'Robert Burns', title: 'A Red, Red Rose', lines: ['我的爱像六月新开的红玫瑰', '也像甜美合拍的旋律', '直到海水干涸，我仍爱你'] },
  { id: 'coleridge-frost', author: 'Samuel Taylor Coleridge', title: 'Frost at Midnight', lines: ['霜履行着它秘密的职责', '没有风声，也没有求助', '小屋里只剩沉思醒着'] },
  { id: 'wordsworth-tintern', author: 'William Wordsworth', title: 'Tintern Abbey', lines: ['这些陡峭的山崖给我深刻的印象', '它们与宁静的天空相连', '在孤独的心里安放更深的思想'] },
  { id: 'keats-grecian', author: 'John Keats', title: 'Ode on a Grecian Urn', lines: ['你仍是静默的新娘', '寂静与缓慢时间的养子', '你用花叶的故事挑逗我们的思索'] },
  { id: 'keats-autumn', author: 'John Keats', title: 'To Autumn', lines: ['雾与成熟果实的季节', '你是成熟太阳的亲密朋友', '商量着怎样让藤蔓结满果子'] },
  { id: 'shelley-ozymandias', author: 'Percy Bysshe Shelley', title: 'Ozymandias', lines: ['沙漠里立着两条残断的石腿', '冷漠的面容仍命令着空无', '四周只剩无边的荒沙'] },
  { id: 'byron-darkness', author: 'Lord Byron', title: 'Darkness', lines: ['我梦见一个梦，并不全是梦', '明亮的太阳熄灭在虚空里', '星辰盲目地游荡，没有光'] },
  { id: 'blake-london', author: 'William Blake', title: 'London', lines: ['我走过每一条被标记的街道', '也走过被标记的河岸', '每张面孔都写着无力与悲伤'] },
  { id: 'tennyson-lotus', author: 'Alfred, Lord Tennyson', title: 'The Lotos-Eaters', lines: ['勇气啊，何必像疲惫的生命般挣扎', '一切都有安歇的时候', '让我们放下漫长的劳作'] },
  { id: 'arnold-scholar', author: 'Matthew Arnold', title: 'The Scholar-Gipsy', lines: ['仍在等待那一声奇妙的召唤', '等待被知识照亮的瞬间', '你的生命不被庸常的焦虑分割'] },
  { id: 'hardy-after', author: 'Thomas Hardy', title: 'Afterwards', lines: ['当我离开，若人们问起我', '愿他们说：他看见过暮色', '也看见过刺猬悄悄走出篱笆'] },
  { id: 'yeats-second-coming', author: 'W. B. Yeats', title: 'The Second Coming', lines: ['旋转着，旋转在不断扩大的螺旋里', '猎鹰再也听不见驯鹰人', '中心无法维系，世界开始松动'] },
  { id: 'yeats-sailing', author: 'W. B. Yeats', title: 'Sailing to Byzantium', lines: ['那不是适合老人停留的国度', '年轻人彼此拥抱在树间歌唱', '鱼儿、飞鸟与万物都沉醉于诞生'] },
  { id: 'teasdale-stars', author: 'Sara Teasdale', title: 'Stars', lines: ['孤独的夜晚，我看见星辰升起', '白色而寂静，像陌生的花', '它们不说话，却照亮了远方'] },
  { id: 'tagore-stream', author: 'Rabindranath Tagore', title: 'Gitanjali', lines: ['同一条生命在我的血液里流动', '也在世界的脉搏中舞蹈', '我因这生命而骄傲'] },
  { id: 'gibran-joy', author: 'Kahlil Gibran', title: 'The Prophet', lines: ['你的欢笑不曾孤单', '它正是你悲伤卸下面具', '在心的深井里重新升起'] },
  { id: 'baudelaire-albatross', author: 'Charles Baudelaire', title: 'The Albatross', lines: ['诗人像云端的信天翁', '嘲笑风暴，也嘲笑弓手', '落到甲板上，巨翼反成障碍'] },
  { id: 'verlaine-song', author: 'Paul Verlaine', title: 'Chanson d’automne', lines: ['秋天的小提琴声', '以单调的音节刺痛心灵', '时钟一响，我便想起往昔'] },
  { id: 'mallarme-breeze', author: 'Stéphane Mallarmé', title: 'Sea Breeze', lines: ['肉身是悲伤的，我已读遍所有书', '逃吧，逃到更远的地方', '我听见鸟儿在陌生的泡沫间飞翔'] },
  { id: 'apollinaire-bridge', author: 'Guillaume Apollinaire', title: 'Le Pont Mirabeau', lines: ['米拉波桥下，塞纳河流过', '我们的爱情也必须被记起', '欢乐总在悲伤之后到来'] },
  { id: 'rilke-panther', author: 'Rainer Maria Rilke', title: 'The Panther', lines: ['它的目光掠过栅栏，已经疲惫', '仿佛世界只剩千万根铁栏', '铁栏之后，再没有风景'] },
  { id: 'rilke-autumn', author: 'Rainer Maria Rilke', title: 'Autumn Day', lines: ['主啊，是时候了，夏天太长', '把影子投在日晷上', '让最后的果实再饱满两天'] },
  { id: 'goethe-erlkonig', author: 'Johann Wolfgang von Goethe', title: 'Erlkönig', lines: ['谁在深夜与风中飞驰', '是一位父亲，怀抱着孩子', '他紧紧搂住那颤抖的身躯'] },
  { id: 'schiller-joy', author: 'Friedrich Schiller', title: 'Ode to Joy', lines: ['欢乐啊，神明美丽的火花', '你来自极乐的乐园', '我们醉意朦胧地踏进你的圣殿'] },
  { id: 'heine-lorelei', author: 'Heinrich Heine', title: 'Die Lorelei', lines: ['我不知是什么忧伤', '使我的心如此沉重', '一个古老的故事，始终不散'] },
  { id: 'holderlin-bread-wine', author: 'Friedrich Hölderlin', title: 'Bread and Wine', lines: ['如今朋友，我们为何沉默', '古老的神圣夜晚已降临', '谁能说出众神归来的时刻'] },
  { id: 'novalis-blue-flower', author: 'Novalis', title: 'Heinrich von Ofterdingen', lines: ['他看见一朵蓝花', '花瓣温柔地转向他', '它仿佛藏着世界的秘密'] },
  { id: 'pushkin-prophet', author: 'Alexander Pushkin', title: 'The Prophet', lines: ['在荒凉的旷野里，我渴得发苦', '六翼的天使来到我面前', '用轻手触碰我的眼睛'] },
  { id: 'lermontov-clouds', author: 'Mikhail Lermontov', title: 'Clouds', lines: ['天上的云，永恒的流浪者', '你们像我一样，被放逐在远方', '谁又驱赶着你们离开亲爱的北方'] },
  { id: 'blok-night', author: 'Alexander Blok', title: 'Night, Street, Lamp, Pharmacy', lines: ['夜晚，街道，灯，药房', '无意义而又昏暗的光', '活上四分之一世纪，一切仍是这样'] },
  { id: 'machado-walker', author: 'Antonio Machado', title: 'Proverbs and Songs', lines: ['行者，没有路', '路是你走出来的', '回首时，只见海上的航迹'] },
  { id: 'dante-stars', author: 'Dante Alighieri', title: 'Paradiso', lines: ['那推动太阳与群星的爱', '也推动沉默的夜与海', '使漫长的旅程终于明亮'] },
  { id: 'petrarch-breeze', author: 'Francesco Petrarca', title: 'Canzoniere 126', lines: ['清澈、甜美、温柔的流水', '她美丽的肢体曾在这里安歇', '草地记得她，风也记得'] },
  { id: 'leopardi-infinite-2', author: 'Giacomo Leopardi', title: 'L’Infinito', lines: ['我在寂静里听见无尽的空间', '听见超人的沉默与最深的宁静', '心几乎在这浩瀚中失去自己'] },
  { id: 'sappho-moon', author: 'Sappho', title: 'Fragment 34', lines: ['群星都围着明亮的月亮', '把脸藏进光里', '银色洒满大地'] },
  { id: 'horace-carpe', author: 'Horace', title: 'Odes', lines: ['不要追问明天会怎样', '把今天握在手中', '对未来少一些信任'] },
  { id: 'virgil-rural', author: 'Virgil', title: 'Eclogues', lines: ['牧人躺在宽阔山毛榉下', '练习着野林教他的歌', '远处的羊群把下午拉得很长'] },
  { id: 'ovid-change', author: 'Ovid', title: 'Metamorphoses', lines: ['我想说的，是形体如何改变', '如何进入新的身体', '愿众神引导这首歌直到我的时代'] },
  { id: 'catullus-sparrow', author: 'Catullus', title: 'Poem 2', lines: ['小麻雀，我爱人的玩伴', '她常把你抱在膝头逗弄', '在悲伤时，把心交给你'] },
  { id: 'homer-dawn', author: 'Homer', title: 'The Odyssey', lines: ['当黎明露出玫瑰色的手指', '她从海的边缘升起', '新的航程在光里苏醒'] },
  { id: 'sophocles-wonders', author: 'Sophocles', title: 'Antigone', lines: ['世上奇迹很多', '却没有一种比人更奇妙', '他穿过冬海，驯服大地'] },
  { id: 'euripides-wind', author: 'Euripides', title: 'Medea', lines: ['愿阿尔戈号从未穿过蓝色的岩石', '愿那松木从未长成船桨', '许多悲剧便不会出航'] },
  { id: 'pindar-water', author: 'Pindar', title: 'Olympian Odes', lines: ['水是最好的东西', '金子像夜里的火焰闪耀', '而荣耀使人的名字更长久'] },
  { id: 'rumi-guest-house', author: 'Jalal al-Din Rumi', title: 'The Guest House', lines: ['这一生是一间客栈', '每个清晨都有新的来客', '即使悲伤，也请迎它进门'] },
  { id: 'hafiz-sun', author: 'Hafez', title: 'Ghazal', lines: ['我愿把太阳的酒斟给你', '让你的心忘记所有阴影', '在清晨的花园里重新明亮'] },
  { id: 'khayyam-dawn', author: 'Omar Khayyam', title: 'Rubáiyát', lines: ['醒来吧，晨光已把星辰赶走', '东方的猎手捕住了苏丹的塔楼', '金色的套索拉紧了白昼'] },
  { id: 'kabir-drop', author: 'Kabir', title: 'Songs', lines: ['水滴落进海里，谁能把它找回', '海也落进水滴里，谁能说它太小', '请听见这两件事同时发生'] },
  { id: 'tagore-cloud', author: 'Rabindranath Tagore', title: 'Stray Birds', lines: ['云把水化作雨献给自己', '花把香气化作风交给世界', '爱让离开也有了形状'] },
  { id: 'gibran-work', author: 'Kahlil Gibran', title: 'The Prophet', lines: ['工作是让爱显出形体', '若不能带着爱工作', '不如停下，听见自己真正的心'] },
  { id: 'rumi-reed', author: 'Jalal al-Din Rumi', title: 'Masnavi', lines: ['听这芦笛如何诉说离别', '它从芦苇丛被割下以后', '每一声都在寻找归处'] }
]

export const EDITORIAL_POEMS: readonly EditorialPoem[] = [
  ...CORE_EDITORIAL_POEMS,
  ...EXTENDED_EDITORIAL_POEMS
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
