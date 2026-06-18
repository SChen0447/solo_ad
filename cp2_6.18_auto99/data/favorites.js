let favoriteIds = [];

export const getAllFavorites = () => favoriteIds;

export const isFavorite = (cardId) => favoriteIds.includes(cardId);

export const addFavorite = (cardId) => {
  if (!favoriteIds.includes(cardId)) {
    favoriteIds.push(cardId);
  }
  return { cardId, favorited: true };
};

export const removeFavorite = (cardId) => {
  const index = favoriteIds.indexOf(cardId);
  if (index > -1) {
    favoriteIds.splice(index, 1);
  }
  return { cardId, favorited: false };
};

export const toggleFavorite = (cardId) => {
  if (favoriteIds.includes(cardId)) {
    return removeFavorite(cardId);
  } else {
    return addFavorite(cardId);
  }
};
