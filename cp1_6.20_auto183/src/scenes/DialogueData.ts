export interface DialogueTurn {
  roleLine: string;
  expectedKeywords: string[];
  standardAnswer: string;
  grammarRules: string[];
}

export interface SceneData {
  id: string;
  name: string;
  roleName: string;
  icon: string;
  turns: DialogueTurn[];
}

export const scenesData: Record<string, SceneData> = {
  restaurant: {
    id: 'restaurant',
    name: '餐厅点餐',
    roleName: '服务员',
    icon: '🍽️',
    turns: [
      {
        roleLine: 'Good evening! Welcome to our restaurant. Do you have a reservation?',
        expectedKeywords: ['reservation', 'book', 'table', 'yes', 'no'],
        standardAnswer: 'Yes, I have a reservation for two people.',
        grammarRules: ['present-simple', 'article'],
      },
      {
        roleLine: 'Certainly! Could I have your name, please?',
        expectedKeywords: ['name', 'my name is', 'I am'],
        standardAnswer: 'My name is John Smith.',
        grammarRules: ['possessive', 'present-simple'],
      },
      {
        roleLine: 'Thank you, Mr. Smith. Here is your table. Would you like to see the menu?',
        expectedKeywords: ['menu', 'yes', 'please', 'like'],
        standardAnswer: 'Yes, please. I would like to see the menu.',
        grammarRules: ['would-like', 'polite-request'],
      },
      {
        roleLine: 'Here you go. Today is special is the grilled salmon with vegetables.',
        expectedKeywords: ['salmon', 'special', 'recommend', 'what'],
        standardAnswer: 'What do you recommend? I want to try the special.',
        grammarRules: ['present-simple', 'wh-question'],
      },
      {
        roleLine: 'The salmon is very popular. Would you like to order an appetizer first?',
        expectedKeywords: ['appetizer', 'soup', 'salad', 'yes', 'no'],
        standardAnswer: 'I will have a Caesar salad as an appetizer.',
        grammarRules: ['future-will', 'article'],
      },
      {
        roleLine: 'Excellent choice. And for the main course?',
        expectedKeywords: ['main course', 'I will have', 'I would like', 'order'],
        standardAnswer: 'I would like the grilled salmon for the main course.',
        grammarRules: ['would-like', 'article'],
      },
      {
        roleLine: 'Would you like something to drink with your meal?',
        expectedKeywords: ['drink', 'water', 'wine', 'beer', 'juice'],
        standardAnswer: 'I would like a glass of white wine, please.',
        grammarRules: ['would-like', 'measure-words'],
      },
      {
        roleLine: 'Perfect. Your order will be ready shortly. Enjoy your meal!',
        expectedKeywords: ['thank', 'thanks', 'you too', 'great'],
        standardAnswer: 'Thank you very much!',
        grammarRules: ['gratitude', 'politeness'],
      },
    ],
  },
  airport: {
    id: 'airport',
    name: '机场登机',
    roleName: '值机员',
    icon: '✈️',
    turns: [
      {
        roleLine: 'Good morning! May I see your passport and ticket, please?',
        expectedKeywords: ['passport', 'ticket', 'here', 'sure'],
        standardAnswer: 'Yes, here is my passport and ticket.',
        grammarRules: ['here-be', 'possessive'],
      },
      {
        roleLine: 'Thank you. Where are you flying to today?',
        expectedKeywords: ['flying', 'to', 'destination', 'going'],
        standardAnswer: 'I am flying to Paris, France.',
        grammarRules: ['present-continuous', 'preposition-to'],
      },
      {
        roleLine: 'I see. Do you have any luggage to check in?',
        expectedKeywords: ['luggage', 'bag', 'suitcase', 'check in'],
        standardAnswer: 'I have one suitcase to check in.',
        grammarRules: ['have-got', 'infinitive'],
      },
      {
        roleLine: 'Okay. Would you prefer a window seat or an aisle seat?',
        expectedKeywords: ['window', 'aisle', 'seat', 'prefer'],
        standardAnswer: 'I would like a window seat, please.',
        grammarRules: ['would-like', 'article'],
      },
      {
        roleLine: 'Certainly. Here is your boarding pass. Your gate is A12.',
        expectedKeywords: ['boarding pass', 'gate', 'thank', 'what time'],
        standardAnswer: 'Thank you. What time does boarding start?',
        grammarRules: ['present-simple', 'wh-question'],
      },
      {
        roleLine: 'Boarding starts at 2:30 PM. Do you have any carry-on bags?',
        expectedKeywords: ['carry-on', 'bag', 'yes', 'no', 'laptop'],
        standardAnswer: 'Yes, I have one carry-on bag with my laptop.',
        grammarRules: ['there-be', 'preposition-with'],
      },
      {
        roleLine: 'That is fine. Have you been to Paris before?',
        expectedKeywords: ['been', 'before', 'yes', 'no', 'first time'],
        standardAnswer: 'No, this is my first time visiting Paris.',
        grammarRules: ['present-perfect', 'first-time'],
      },
      {
        roleLine: 'Wonderful! Enjoy your flight. Have a safe trip!',
        expectedKeywords: ['thank', 'thanks', 'you too', 'bye'],
        standardAnswer: 'Thank you very much. Goodbye!',
        grammarRules: ['gratitude', 'farewell'],
      },
    ],
  },
  hotel: {
    id: 'hotel',
    name: '酒店入住',
    roleName: '前台接待',
    icon: '🏨',
    turns: [
      {
        roleLine: 'Good afternoon! Welcome to the Grand Hotel. How may I help you?',
        expectedKeywords: ['check in', 'reservation', 'booked', 'room'],
        standardAnswer: 'I would like to check in. I have a reservation.',
        grammarRules: ['would-like', 'present-perfect'],
      },
      {
        roleLine: 'Of course! Could I have your full name, please?',
        expectedKeywords: ['name', 'my name is', 'I am'],
        standardAnswer: 'My name is Sarah Johnson.',
        grammarRules: ['possessive', 'present-simple'],
      },
      {
        roleLine: 'Thank you, Ms. Johnson. Let me find your reservation.',
        expectedKeywords: ['thank', 'sure', 'take your time', 'ok'],
        standardAnswer: 'Thank you. Take your time.',
        grammarRules: ['imperative', 'gratitude'],
      },
      {
        roleLine: 'Found it! You booked a double room for three nights, right?',
        expectedKeywords: ['double room', 'three nights', 'yes', 'correct'],
        standardAnswer: 'Yes, that is correct. A double room for three nights.',
        grammarRules: ['demonstrative', 'agreement'],
      },
      {
        roleLine: 'Could you fill out this registration form, please?',
        expectedKeywords: ['form', 'fill out', 'sure', 'of course'],
        standardAnswer: 'Certainly. I will fill out the form right now.',
        grammarRules: ['future-will', 'adverb'],
      },
      {
        roleLine: 'Thank you. Could I see your ID or passport?',
        expectedKeywords: ['passport', 'ID', 'here', 'sure'],
        standardAnswer: 'Here is my passport. Is everything okay?',
        grammarRules: ['here-be', 'question-tag'],
      },
      {
        roleLine: 'Everything is perfect. Here is your room key. You are in room 305.',
        expectedKeywords: ['room key', 'thank', 'breakfast', 'where'],
        standardAnswer: 'Thank you! Is breakfast included?',
        grammarRules: ['passive', 'wh-question'],
      },
      {
        roleLine: 'Yes, breakfast is from 7 to 10 AM on the second floor. Enjoy your stay!',
        expectedKeywords: ['thank', 'thanks', 'great', 'wonderful'],
        standardAnswer: 'Thank you very much! I am sure I will enjoy it.',
        grammarRules: ['future-will', 'certainty'],
      },
    ],
  },
  shopping: {
    id: 'shopping',
    name: '商场购物',
    roleName: '导购员',
    icon: '🛍️',
    turns: [
      {
        roleLine: 'Good afternoon! Welcome to our store. Is there anything I can help you with?',
        expectedKeywords: ['looking', 'browsing', 'shirt', 'dress', 'help'],
        standardAnswer: 'I am just browsing, but thank you.',
        grammarRules: ['present-continuous', 'conjunction'],
      },
      {
        roleLine: 'No problem at all. Let me know if you need any assistance.',
        expectedKeywords: ['thank', 'sure', 'will do', 'ok'],
        standardAnswer: 'Thank you, I will let you know.',
        grammarRules: ['future-will', 'if-clause'],
      },
      {
        roleLine: 'Actually, I noticed you were looking at our jacket collection. It is on sale this week.',
        expectedKeywords: ['sale', 'discount', 'how much', 'price'],
        standardAnswer: 'Oh really? How much does it cost?',
        grammarRules: ['wh-question', 'do-question'],
      },
      {
        roleLine: 'It is 30% off. The original price was $120, now it is only $84.',
        expectedKeywords: ['discount', 'great', 'good deal', 'cheap'],
        standardAnswer: 'That is a great deal! What colors does it come in?',
        grammarRules: ['exclamation', 'what-question'],
      },
      {
        roleLine: 'We have black, blue, and gray. Would you like to try one on?',
        expectedKeywords: ['try on', 'size', 'medium', 'large'],
        standardAnswer: 'Yes, can I try on a medium in blue?',
        grammarRules: ['can-request', 'try-phrasal'],
      },
      {
        roleLine: 'Certainly! The fitting rooms are over there. Let me get one for you.',
        expectedKeywords: ['thank', 'fitting room', 'here'],
        standardAnswer: 'Thank you! Where is the fitting room?',
        grammarRules: ['where-question', 'definite-article'],
      },
      {
        roleLine: 'How does it fit? Does it feel comfortable?',
        expectedKeywords: ['fit', 'comfortable', 'little', 'big', 'small'],
        standardAnswer: 'It fits well, but it is a little tight in the sleeves.',
        grammarRules: ['but-contrast', 'degree-adverb'],
      },
      {
        roleLine: 'I see. Would you like to try a larger size?',
        expectedKeywords: ['yes', 'larger', 'bigger', 'no', 'buy'],
        standardAnswer: 'Yes, please. I would like to try a large one.',
        grammarRules: ['comparative', 'would-like'],
      },
    ],
  },
};

export const getSceneById = (id: string): SceneData | undefined => {
  return scenesData[id];
};

export const getAllScenes = (): SceneData[] => {
  return Object.values(scenesData);
};
