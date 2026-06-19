/**
 * 词语配置模块 - 可插拔的词语数据源
 *
 * 设计说明：
 *   本文件作为独立配置模块，集中管理所有词语数据。
 *   未来如需从外部JSON文件或API加载词语，只需修改此文件，
 *   提供相同的 WORD_CONFIG 导出接口即可，无需修改其他文件。
 *
 * 数据结构：
 *   - word: 完整词语
 *   - parts: 拆分后的汉字部件（按汉字拆分）
 *   - hint: 提示内容（拼音 + 释义），学生卡住时可查看
 *
 * 使用方式：
 *   import { WORD_CONFIG } from './data/wordConfig';
 *   或从外部JSON文件导入后赋值给 WORD_CONFIG 再导出
 */

export interface WordConfigItem {
  word: string;
  parts: string[];
  hint: string;
}

export const WORD_CONFIG: WordConfigItem[] = [
  { word: '森林', parts: ['森', '林'], hint: 'sēn lín：大片生长的树木' },
  { word: '蝴蝶', parts: ['蝴', '蝶'], hint: 'hú dié：一种美丽的昆虫，翅膀上有彩色花纹' },
  { word: '勇气', parts: ['勇', '气'], hint: 'yǒng qì：敢作敢为、毫不畏惧的气概' },
  { word: '海洋', parts: ['海', '洋'], hint: 'hǎi yáng：地球上连成一片的海和洋的统称' },
  { word: '朋友', parts: ['朋', '友'], hint: 'péng you：彼此有交情的人' },
  { word: '知识', parts: ['知', '识'], hint: 'zhī shí：人们在实践中获得的认识和经验' },
  { word: '快乐', parts: ['快', '乐'], hint: 'kuài lè：感到幸福或满意' },
  { word: '梦想', parts: ['梦', '想'], hint: 'mèng xiǎng：对未来的美好想象和希望' },
  { word: '希望', parts: ['希', '望'], hint: 'xī wàng：心里想着达到某种目的或出现某种情况' },
  { word: '阳光', parts: ['阳', '光'], hint: 'yáng guāng：太阳发出的光' },
  { word: '彩虹', parts: ['彩', '虹'], hint: 'cǎi hóng：雨后天空出现的彩色圆弧' },
  { word: '花园', parts: ['花', '园'], hint: 'huā yuán：种植花木供游玩休息的场所' },
  { word: '星星', parts: ['星', '星'], hint: 'xīng xing：夜晚天空中闪烁发光的天体' },
  { word: '月亮', parts: ['月', '亮'], hint: 'yuè liang：月球的通称，夜晚发光' },
  { word: '春风', parts: ['春', '风'], hint: 'chūn fēng：春天的风，温暖柔和' },
  { word: '秋雨', parts: ['秋', '雨'], hint: 'qiū yǔ：秋天的雨，带来凉意' },
  { word: '青山', parts: ['青', '山'], hint: 'qīng shān：长满绿色植物的山' },
  { word: '绿水', parts: ['绿', '水'], hint: 'lǜ shuǐ：碧绿的水，形容清澈' },
  { word: '老师', parts: ['老', '师'], hint: 'lǎo shī：传授文化、技术的人' },
  { word: '学生', parts: ['学', '生'], hint: 'xué sheng：在学校读书的人' },

  { word: '祖国', parts: ['祖', '国'], hint: 'zǔ guó：自己的国家' },
  { word: '故乡', parts: ['故', '乡'], hint: 'gù xiāng：出生或长期居住过的地方' },
  { word: '勤劳', parts: ['勤', '劳'], hint: 'qín láo：努力劳动，不怕辛苦' },
  { word: '善良', parts: ['善', '良'], hint: 'shàn liáng：心地好，对人和蔼' },
  { word: '聪明', parts: ['聪', '明'], hint: 'cōng míng：智力高，反应快' },
  { word: '勇敢', parts: ['勇', '敢'], hint: 'yǒng gǎn：有胆量，不怕危险' },
  { word: '认真', parts: ['认', '真'], hint: 'rèn zhēn：严肃对待，不马虎' },
  { word: '团结', parts: ['团', '结'], hint: 'tuán jié：为了共同目标互相支持' },
  { word: '健康', parts: ['健', '康'], hint: 'jiàn kāng：身体强壮，没有疾病' },
  { word: '幸福', parts: ['幸', '福'], hint: 'xìng fú：生活愉快美满' },

  { word: '清晨', parts: ['清', '晨'], hint: 'qīng chén：刚刚日出的时候' },
  { word: '傍晚', parts: ['傍', '晚'], hint: 'bàng wǎn：临近晚上的时候' },
  { word: '灿烂', parts: ['灿', '烂'], hint: 'càn làn：光彩鲜明耀眼' },
  { word: '宁静', parts: ['宁', '静'], hint: 'níng jìng：安静，没有声音' },
  { word: '热闹', parts: ['热', '闹'], hint: 'rè nao：景象繁盛活跃' },
  { word: '美丽', parts: ['美', '丽'], hint: 'měi lì：好看，漂亮' },
  { word: '温暖', parts: ['温', '暖'], hint: 'wēn nuǎn：暖和，让人感到舒适' },
  { word: '清凉', parts: ['清', '凉'], hint: 'qīng liáng：凉爽，让人感觉舒服' },
  { word: '丰收', parts: ['丰', '收'], hint: 'fēng shōu：收成好，产量高' },
  { word: '节日', parts: ['节', '日'], hint: 'jié rì：值得庆祝的日子' }
];

export const DEFAULT_WORD_COUNT = 20;
