// Complete emoji guessing function
export default function guessEmoji(goalName) {
  if (!goalName) return '🎯';
  
  const name = goalName.toLowerCase().trim();
  
  // 🏠 Housing related
  if (name.includes('home') || name.includes('house') || name.includes('apartment') || 
      name.includes('condo') || name.includes('property') || name.includes('mortgage') ||
      name.includes('down payment') || name.includes('rental') || name.includes('real estate')) {
    return '🏠';
  }
  
  // 🚗 Vehicles
  if (name.includes('car') || name.includes('vehicle') || name.includes('auto') ||
      name.includes('motor') || name.includes('bike') || name.includes('scooter') ||
      name.includes('tesla') || name.includes('honda') || name.includes('toyota')) {
    return '🚗';
  }
  
  // ✈️ Travel vacation
  if (name.includes('travel') || name.includes('vacation') || name.includes('holiday') ||
      name.includes('trip') || name.includes('flight') || name.includes('beach') ||
      name.includes('europe') || name.includes('asia') || name.includes('america') ||
      name.includes('japan') || name.includes('korea') || name.includes('bali') ||
      name.includes('island') || name.includes('cruise') || name.includes('backpack')) {
    return '✈️';
  }
  
  // 🎓 Education learning
  if (name.includes('education') || name.includes('study') || name.includes('school') ||
      name.includes('college') || name.includes('university') || name.includes('tuition') ||
      name.includes('course') || name.includes('degree') || name.includes('master') ||
      name.includes('phd') || name.includes('certificate') || name.includes('learning')) {
    return '🎓';
  }
  
  // 💍 Wedding relationship
  if (name.includes('wedding') || name.includes('marriage') || name.includes('ring') ||
      name.includes('proposal') || name.includes('honeymoon') || name.includes('bride') ||
      name.includes('groom') || name.includes('anniversary')) {
    return '💍';
  }
  
  // 👶 Family children
  if (name.includes('baby') || name.includes('child') || name.includes('kid') ||
      name.includes('family') || name.includes('parent') || name.includes('birth') ||
      name.includes('maternity') || name.includes('paternity') || name.includes('nursery')) {
    return '👶';
  }
  
  // 🏥 Medical health
  if (name.includes('medical') || name.includes('health') || name.includes('hospital') ||
      name.includes('doctor') || name.includes('surgery') || name.includes('dental') ||
      name.includes('therapy') || name.includes('medicine') || name.includes('insurance')) {
    return '🏥';
  }
  
  // 📱 Electronics
  if (name.includes('phone') || name.includes('iphone') || name.includes('samsung') ||
      name.includes('laptop') || name.includes('macbook') || name.includes('computer') ||
      name.includes('tablet') || name.includes('ipad') || name.includes('gadget') ||
      name.includes('camera') || name.includes('drone') || name.includes('tech')) {
    return '📱';
  }
  
  // 🎮 Entertainment games
  if (name.includes('game') || name.includes('gaming') || name.includes('playstation') ||
      name.includes('xbox') || name.includes('nintendo') || name.includes('entertainment') ||
      name.includes('hobby') || name.includes('fun') || name.includes('leisure')) {
    return '🎮';
  }
  
  // 🛋️ Furniture appliances
  if (name.includes('furniture') || name.includes('sofa') || name.includes('bed') ||
      name.includes('table') || name.includes('chair') || name.includes('appliance') ||
      name.includes('tv') || name.includes('television') || name.includes('refrigerator') ||
      name.includes('washing') || name.includes('aircon') || name.includes('conditioner')) {
    return '🛋️';
  }
  
  // 👴 Retirement pension
  if (name.includes('retirement') || name.includes('pension') || name.includes('old age') ||
      name.includes('senior') || name.includes('golden years') || name.includes('401k') ||
      name.includes('epf') || name.includes('kwsp')) {
    return '👴';
  }
  
  // 📈 Investment finance
  if (name.includes('investment') || name.includes('stock') || name.includes('share') ||
      name.includes('crypto') || name.includes('bitcoin') || name.includes('ethereum') ||
      name.includes('mutual fund') || name.includes('fd') || name.includes('fixed deposit') ||
      name.includes('asb') || name.includes('unit trust') || name.includes('portfolio')) {
    return '📈';
  }
  
  // 🎁 Gifts holidays
  if (name.includes('gift') || name.includes('present') || name.includes('christmas') ||
      name.includes('birthday') || name.includes('anniversary') || name.includes('celebration') ||
      name.includes('party') || name.includes('festival') || name.includes('eid') ||
      name.includes('cny') || name.includes('deepavali')) {
    return '🎁';
  }
  
  // 🐾 Pets animals
  if (name.includes('pet') || name.includes('dog') || name.includes('cat') ||
      name.includes('animal') || name.includes('vet') || name.includes('veterinary') ||
      name.includes('puppy') || name.includes('kitten')) {
    return '🐾';
  }
  
  // 🎨 Art creation
  if (name.includes('art') || name.includes('music') || name.includes('painting') ||
      name.includes('instrument') || name.includes('guitar') || name.includes('piano') ||
      name.includes('creative') || name.includes('design') || name.includes('craft')) {
    return '🎨';
  }
  
  // ⚽ Sports fitness
  if (name.includes('sport') || name.includes('fitness') || name.includes('gym') ||
      name.includes('exercise') || name.includes('yoga') || name.includes('running') ||
      name.includes('bicycle') || name.includes('swimming') || name.includes('hiking')) {
    return '⚽';
  }
  
  // 🍽️ Dining food
  if (name.includes('food') || name.includes('restaurant') || name.includes('dining') ||
      name.includes('cooking') || name.includes('recipe') || name.includes('groceries') ||
      name.includes('meal') || name.includes('buffet') || name.includes('feast')) {
    return '🍽️';
  }
  
  // 🛍️ Shopping fashion
  if (name.includes('shopping') || name.includes('fashion') || name.includes('clothes') ||
      name.includes('dress') || name.includes('shoes') || name.includes('bag') ||
      name.includes('accessory') || name.includes('jewelry') || name.includes('watch')) {
    return '🛍️';
  }
  
  // 💼 Work career
  if (name.includes('business') || name.includes('work') || name.includes('career') ||
      name.includes('office') || name.includes('startup') || name.includes('entrepreneur') ||
      name.includes('professional') || name.includes('equipment') || name.includes('tools')) {
    return '💼';
  }
  
  // 🎉 Events experiences
  if (name.includes('event') || name.includes('concert') || name.includes('movie') ||
      name.includes('cinema') || name.includes('theater') || name.includes('show') ||
      name.includes('festival') || name.includes('exhibition') || name.includes('museum')) {
    return '🎉';
  }
  
  // 🚨 Emergency fund
  if (name.includes('emergency') || name.includes('rainy day') || name.includes('backup') ||
      name.includes('safety') || name.includes('reserve') || name.includes('buffer')) {
    return '🚨';
  }
  
  // 💰 General savings
  if (name.includes('savings') || name.includes('save') || name.includes('fund') ||
      name.includes('money') || name.includes('cash') || name.includes('deposit')) {
    return '💰';
  }
  
  // 🎯 Default goal
  return '🎯';
};

// Run test
// testEmojiGuessing();