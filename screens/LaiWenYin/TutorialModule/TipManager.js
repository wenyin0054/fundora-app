// TipManager.js
import { useState, useCallback } from 'react';
import tipData from '../../../assets/financialTipsData.json';

export const useTipManager = (userLevel = 'beginner') => {
  const [currentTip, setCurrentTip] = useState('');
  const [isTipVisible, setIsTipVisible] = useState(false);

  const getTip = useCallback((module, context = 'default', level = userLevel) => {
    // Support nested keys with dot notation
    const keys = context.split('.');
    let tipObject = tipData?.[module];
    
    for (const key of keys) {
      if (tipObject && typeof tipObject === 'object') {
        tipObject = tipObject[key];
      } else {
        tipObject = undefined;
        break;
      }
    }
    
    return (
      tipObject?.[level] ||
      tipData?.[module]?.default?.[level] ||
      "No tips available."
    );
  }, [userLevel]);

  
  const showTip = useCallback((module, context = 'default') => {
    const tip = getTip(module, context, userLevel);
    setCurrentTip(tip);
    setIsTipVisible(true);
  }, [getTip, userLevel]);

  const hideTip = useCallback(() => {
    setIsTipVisible(false);
  }, []);

  // Timed tip for auto-show + hide
  const showTimedTip = useCallback(
    (module, context = 'default', duration = 5000) => {
      showTip(module, context);
      setTimeout(() => {
        hideTip();
      }, duration);
    },
    [showTip, hideTip]
  );

  return {
    currentTip,
    isTipVisible,
    showTip,
    hideTip,
    showTimedTip,
  };
};
