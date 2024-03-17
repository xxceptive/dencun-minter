export const getRandomInt = (min, max) => {
    let delta = max - min;
    return Math.round(min + Math.random() * delta);
}

export const getRandomFloat = (min, max) => {
    let delta = max - min;
    return min + Math.random() * delta;
}

export const getRandomElement = (array) => {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export const shuffle = (array) => {
    array.sort(() => Math.random() - 0.5);
    return array
}

export const getRandomTicker = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const len = getRandomInt(3, 5)
    let tiker = ''

    for (let i = 0; i < len; i++) {
        let randomChar = getRandomElement(alphabet)
        tiker = tiker + randomChar
    }

    return tiker
}