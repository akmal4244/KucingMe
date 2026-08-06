export interface UserData {
  coins: number;
  highscores: {
    timeAttack: number;
    survival: number;
  };
  unlockedColors: string[];
  equippedColor: string;
  unlockedAccessories: string[];
  equippedAccessory: string | null;
}

const DEFAULT_DATA: UserData = {
  coins: 0,
  highscores: {
    timeAttack: 0,
    survival: 0,
  },
  unlockedColors: ['#f59e0b'],
  equippedColor: '#f59e0b',
  unlockedAccessories: [],
  equippedAccessory: null,
};

export function loadUserData(): UserData {
  try {
    const data = localStorage.getItem('kucingme_data');
    if (data) {
      return { ...DEFAULT_DATA, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load user data', e);
  }
  return DEFAULT_DATA;
}

export function saveUserData(data: UserData) {
  try {
    localStorage.setItem('kucingme_data', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save user data', e);
  }
}
