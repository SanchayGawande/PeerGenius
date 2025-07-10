/**
 * 🧠 Intelligent AI Response Decision Engine
 * Context-aware system for determining when AI should respond in multi-user threads
 */

/**
 * Main decision function for AI response logic with enhanced context awareness
 * @param {string} messageText - The message content to analyze
 * @param {number} participantCount - Number of participants in the thread
 * @param {Object} contextOptions - Additional context for decision making
 * @returns {Object} - Decision result with response recommendation and reasoning
 */
function shouldAIRespond(messageText, participantCount, contextOptions = {}) {
  const message = messageText.toLowerCase().trim();
  const {
    threadHistory = [],
    lastAIResponse = null,
    threadType = 'general',
    userLearningLevel = 'intermediate',
    isStudySession = false
  } = contextOptions;
  
  // Development mode logging (can be disabled in production)
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log(`\n🔍 AI DECISION ENGINE - CONTEXT AWARE`);
    console.log(`👥 Participants: ${participantCount}`);
    console.log(`💬 Message: "${messageText}"`);
    console.log(`🎯 Context: Type=${threadType}, Level=${userLearningLevel}, Study=${isStudySession}`);
  }
  
  // CRITICAL FIX: Enhanced Solo Mode - AI behaves as personal tutor
  if (participantCount === 1) {
    const soloDecision = handleSoloMode(message, messageText, contextOptions, isDevelopment);
    if (isDevelopment) {
      console.log(`✅ SOLO MODE DECISION: ${soloDecision.shouldRespond ? 'RESPOND' : 'SKIP'} - ${soloDecision.reason}`);
    }
    return soloDecision;
  }
  
  // Rule 1.5: Very short messages or simple greetings - don't respond
  if (message.length < 2 || /^(hi|hello|hey|ok|thanks|bye|yes|no|yep|nope)$/i.test(message)) {
    if (isDevelopment) {
      console.log(`❌ BLOCKED: Too short or simple greeting: "${message}"`);
    }
    return false;
  }
  
  // CRITICAL FIX: Enhanced Multi-user mode - AI behaves as collaborative assistant
  if (isDevelopment) {
    console.log(`🚨 MULTI-USER MODE: ${participantCount} participants - analyzing collaborative context...`);
  }
  
  const multiUserDecision = handleMultiUserMode(message, messageText, participantCount, contextOptions, isDevelopment);
  if (isDevelopment) {
    console.log(`${multiUserDecision.shouldRespond ? '✅' : '❌'} MULTI-USER DECISION: ${multiUserDecision.shouldRespond ? 'RESPOND' : 'SKIP'} - ${multiUserDecision.reason}`);
  }
  
  return multiUserDecision;
}

/**
 * CRITICAL FIX: Solo mode decision logic - AI acts as personal tutor
 */
function handleSoloMode(message, originalMessage, contextOptions, isDevelopment) {
  const {
    threadHistory = [],
    lastAIResponse = null,
    userLearningLevel = 'intermediate',
    isStudySession = false
  } = contextOptions;
  
  // In solo mode, AI should be more proactive and supportive
  
  // Block only very short or clearly non-academic messages
  if (message.length < 2 || /^(hi|hello|hey|ok|thanks|bye|yes|no|yep|nope)$/i.test(message)) {
    return {
      shouldRespond: false,
      reason: 'Too short or simple greeting in solo mode',
      responseType: 'none'
    };
  }
  
  // Check for study session context
  if (isStudySession) {
    return {
      shouldRespond: true,
      reason: 'Active study session - AI provides focused tutoring',
      responseType: 'tutoring',
      behaviorMode: 'focused_tutor'
    };
  }
  
  // Analyze message content for solo mode
  const isQuestion = detectQuestion(message, false);
  const hasAcademicIntent = detectAcademicIntent(message, false);
  const hasMathExpression = detectMathExpression(message, false);
  const hasCodePattern = detectCodePattern(message, false);
  const hasEducationalKeywords = detectEducationalKeywords(message, false);
  const isPersonalCasual = detectPersonalCasual(message, false);
  
  // In solo mode, be very responsive to any educational content
  if (hasAcademicIntent || hasMathExpression || hasCodePattern || hasEducationalKeywords) {
    return {
      shouldRespond: true,
      reason: 'Academic content detected in solo mode - personal tutoring',
      responseType: 'educational',
      behaviorMode: 'personal_tutor'
    };
  }
  
  // Respond to questions in solo mode unless clearly personal
  if (isQuestion && !isPersonalCasual) {
    return {
      shouldRespond: true,
      reason: 'Question in solo mode - provide helpful response',
      responseType: 'helpful',
      behaviorMode: 'supportive_assistant'
    };
  }
  
  // For longer messages in solo mode, be more responsive
  if (originalMessage.length > 20 && !isPersonalCasual) {
    return {
      shouldRespond: true,
      reason: 'Substantial message in solo mode - engage thoughtfully',
      responseType: 'conversational',
      behaviorMode: 'thoughtful_companion'
    };
  }
  
  return {
    shouldRespond: false,
    reason: 'Message does not require AI response in solo mode',
    responseType: 'none'
  };
}

/**
 * CRITICAL FIX: Multi-user mode decision logic - AI acts as collaborative facilitator
 */
function handleMultiUserMode(message, originalMessage, participantCount, contextOptions, isDevelopment) {
  const {
    threadHistory = [],
    lastAIResponse = null,
    threadType = 'general',
    userLearningLevel = 'intermediate'
  } = contextOptions;
  
  // In multi-user mode, AI should be more selective and collaborative
  
  // Check for explicit AI mentions first (highest priority)
  const hasExplicitAIMention = checkExplicitAIMention(message, false);
  if (hasExplicitAIMention) {
    return {
      shouldRespond: true,
      reason: 'Explicit AI mention in multi-user thread',
      responseType: 'direct_response',
      behaviorMode: 'collaborative_assistant'
    };
  }
  
  // Analyze message content
  const isQuestion = detectQuestion(message, false);
  const hasAcademicIntent = detectAcademicIntent(message, false);
  const hasMathExpression = detectMathExpression(message, false);
  const hasCodePattern = detectCodePattern(message, false);
  const hasEducationalKeywords = detectEducationalKeywords(message, false);
  const isPersonalCasual = detectPersonalCasual(message, false);
  
  // Block personal/casual conversations in multi-user mode
  if (isPersonalCasual) {
    return {
      shouldRespond: false,
      reason: 'Personal/casual conversation - let users interact naturally',
      responseType: 'none'
    };
  }
  
  // Respond to complex academic questions that would benefit from AI help
  const isComplexAcademicQuestion = isQuestion && hasAcademicIntent && originalMessage.length > 15;
  if (isComplexAcademicQuestion) {
    return {
      shouldRespond: true,
      reason: 'Complex academic question in group - provide educational value',
      responseType: 'educational',
      behaviorMode: 'facilitating_tutor'
    };
  }
  
  // Respond to math problems and code issues in multi-user mode
  if ((hasMathExpression && isQuestion) || (hasCodePattern && (isQuestion || message.includes('error')))) {
    return {
      shouldRespond: true,
      reason: 'Technical problem in group discussion - provide expertise',
      responseType: 'technical_assistance',
      behaviorMode: 'expert_consultant'
    };
  }
  
  // Be more selective in large groups (4+ people)
  if (participantCount >= 4) {
    // Only respond to very clear educational requests
    if (hasAcademicIntent && hasEducationalKeywords && isQuestion) {
      return {
        shouldRespond: true,
        reason: 'Clear educational request in large group',
        responseType: 'educational',
        behaviorMode: 'selective_expert'
      };
    }
    return {
      shouldRespond: false,
      reason: 'Large group - let human discussion flow naturally',
      responseType: 'none'
    };
  }
  
  // In smaller groups (2-3 people), be moderately responsive
  if (hasAcademicIntent && (isQuestion || hasEducationalKeywords)) {
    return {
      shouldRespond: true,
      reason: 'Academic content in small group - supplement discussion',
      responseType: 'supplementary',
      behaviorMode: 'collaborative_tutor'
    };
  }
  
  return {
    shouldRespond: false,
    reason: 'No clear need for AI intervention in group discussion',
    responseType: 'none'
  };
}

/**
 * Check for explicit AI mentions (maintains backward compatibility)
 */
function checkExplicitAIMention(message, isDevelopment) {
  const explicitAIMentions = [
    'ai,', 'ai ', 'hey ai', 'ai can', 'ai help', 'ai please', 'ai explain',
    'artificial intelligence', 'assistant', 'bot'
  ];
  
  for (const mention of explicitAIMentions) {
    if (message.includes(mention)) {
      if (isDevelopment) {
        console.log(`✅ Explicit AI mention found: "${mention}"`);
        console.log(`✅ AI RESPONSE ALLOWED`);
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if message appears to be a question
 */
function detectQuestion(message, isDevelopment) {
  // Enhanced question patterns
  const questionStarters = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'can you', 'could you', 'would you', 'do you', 'does',
    'is', 'are', 'will', 'should', 'must', 'can', 'could',
    'would', 'might', 'may', 'shall'
  ];
  
  // Help-seeking patterns
  const helpPatterns = [
    'help', 'assist', 'support', 'guide', 'show', 'teach',
    'explain', 'clarify', 'elaborate', 'demonstrate'
  ];
  
  // Problem-solving patterns
  const problemPatterns = [
    'solve', 'calculate', 'find', 'determine', 'compute',
    'evaluate', 'analyze', 'work out', 'figure out'
  ];
  
  // Check if starts with question words
  const startsWithQuestion = questionStarters.some(starter => 
    message.startsWith(starter + ' ') || message.startsWith(starter + "'")
  );
  
  // Check if ends with question mark
  const endsWithQuestionMark = message.endsWith('?');
  
  // Check for help-seeking language
  const hasHelpSeeking = helpPatterns.some(pattern => 
    message.includes(pattern + ' me') || 
    message.includes(pattern + ' with') ||
    message.includes('i need ' + pattern) ||
    message.includes('please ' + pattern)
  );
  
  // Check for problem-solving language
  const hasProblemSolving = problemPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // Check for uncertain language (indicates questions)
  const uncertainPatterns = [
    'i don\'t understand', 'i\'m confused', 'i\'m not sure',
    'i can\'t figure out', 'i\'m stuck', 'i need to know',
    'i wonder', 'i\'m wondering'
  ];
  
  const hasUncertainty = uncertainPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // Math expression questions
  const mathQuestionPatterns = [
    /what.*derivative/i,
    /how.*solve/i,
    /what.*integral/i,
    /find.*value/i,
    /calculate.*result/i,
    /what.*equals/i,
    /solve.*equation/i
  ];
  
  const hasMathQuestion = mathQuestionPatterns.some(pattern => 
    pattern.test(message)
  );
  
  const isQuestion = startsWithQuestion || endsWithQuestionMark || 
                    hasHelpSeeking || hasProblemSolving || 
                    hasUncertainty || hasMathQuestion;
  
  if (isDevelopment) {
    if (isQuestion) {
      const reasons = [];
      if (startsWithQuestion) reasons.push('starts with question word');
      if (endsWithQuestionMark) reasons.push('ends with ?');
      if (hasHelpSeeking) reasons.push('help-seeking language');
      if (hasProblemSolving) reasons.push('problem-solving language');
      if (hasUncertainty) reasons.push('uncertain language');
      if (hasMathQuestion) reasons.push('math question pattern');
      
      console.log(`✅ Detected as question: ${reasons.join(', ')}`);
    } else {
      console.log(`❌ Not detected as a question`);
    }
  }
  
  return isQuestion;
}

/**
 * Detect academic intent in the message
 */
function detectAcademicIntent(message, isDevelopment) {
  // CRITICAL FIX: Enhanced academic keywords and phrases - more comprehensive detection
  const academicKeywords = [
    // Action words
    'explain', 'define', 'describe', 'analyze', 'calculate', 'compute',
    'solve', 'derive', 'prove', 'demonstrate', 'show', 'find',
    'determine', 'evaluate', 'interpret', 'summarize', 'compare',
    'simplify', 'expand', 'factor', 'integrate', 'differentiate',
    'convert', 'transform', 'substitute', 'manipulate', 'optimize',
    
    // Subject areas (expanded)
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'trigonometry',
    'physics', 'chemistry', 'biology', 'science', 'engineering',
    'history', 'literature', 'philosophy', 'psychology', 'economics',
    'statistics', 'probability', 'computer science', 'programming',
    'coding', 'software', 'algorithm', 'data structure', 'logic',
    'discrete math', 'linear algebra', 'differential equations',
    'organic chemistry', 'biochemistry', 'molecular biology',
    'thermodynamics', 'electromagnetism', 'quantum mechanics',
    
    // Academic concepts
    'formula', 'equation', 'theorem', 'principle', 'law', 'theory',
    'concept', 'definition', 'derivative', 'integral', 'function',
    'variable', 'constant', 'coefficient', 'hypothesis', 'experiment',
    'research', 'study', 'analysis', 'synthesis', 'conclusion',
    'proof', 'lemma', 'corollary', 'axiom', 'postulate',
    'methodology', 'paradigm', 'framework', 'model', 'approach',
    
    // Academic activities
    'homework', 'assignment', 'project', 'exam', 'test', 'quiz',
    'paper', 'essay', 'report', 'presentation', 'lecture', 'class',
    'course', 'curriculum', 'syllabus', 'textbook', 'chapter',
    'problem set', 'exercise', 'example', 'solution',
    'midterm', 'final', 'grades', 'gpa', 'credit', 'semester',
    
    // Educational intent (expanded)
    'learn', 'understand', 'grasp', 'comprehend', 'master', 'practice',
    'review', 'study', 'memorize', 'remember', 'recall', 'apply',
    'significance', 'importance', 'meaning', 'purpose', 'reason',
    'confused', 'stuck', 'struggling', 'difficulty', 'trouble',
    'clarify', 'elaborate', 'breakdown', 'walkthrough', 'tutorial',
    'guidance', 'instruction', 'teaching', 'learning', 'education',
    
    // Math-specific terms (expanded)
    'limit', 'sum', 'product', 'series', 'sequence', 'matrix',
    'vector', 'graph', 'plot', 'coordinate', 'slope', 'intercept',
    'domain', 'range', 'asymptote', 'discontinuity', 'continuity',
    'tangent', 'normal', 'concave', 'convex', 'maximum', 'minimum',
    'optimization', 'constraint', 'inequality', 'absolute value',
    
    // Science terms (expanded)
    'element', 'compound', 'molecule', 'atom', 'ion', 'bond',
    'reaction', 'catalyst', 'equilibrium', 'energy', 'force',
    'velocity', 'acceleration', 'momentum', 'wave', 'frequency',
    'wavelength', 'amplitude', 'circuit', 'voltage', 'current',
    'resistance', 'capacitance', 'inductance', 'magnetic field',
    
    // Programming/CS terms
    'algorithm', 'data structure', 'recursion', 'iteration', 'loop',
    'conditional', 'variable', 'function', 'class', 'object',
    'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
    'complexity', 'big o', 'sorting', 'searching', 'tree', 'graph',
    'database', 'sql', 'query', 'join', 'index', 'normalization',
    
    // Common academic phrases
    'step by step', 'walk through', 'break down', 'work out',
    'figure out', 'make sense', 'understand better', 'get help',
    'need help', 'can you help', 'please help', 'how do i',
    'how to', 'what is', 'why is', 'when do', 'where does'
  ];
  
  // Academic phrases
  const academicPhrases = [
    'chain rule', 'product rule', 'quotient rule', 'power rule',
    'law of', 'theory of', 'principle of', 'concept of',
    'definition of', 'meaning of', 'significance of',
    'how to', 'way to', 'method to', 'approach to',
    'steps to', 'process of', 'procedure for'
  ];
  
  // Check for academic keywords
  const hasAcademicKeyword = academicKeywords.some(keyword => 
    message.includes(keyword)
  );
  
  // Check for academic phrases
  const hasAcademicPhrase = academicPhrases.some(phrase => 
    message.includes(phrase)
  );
  
  const hasAcademicIntent = hasAcademicKeyword || hasAcademicPhrase;
  
  if (isDevelopment) {
    if (hasAcademicIntent) {
      console.log(`✅ Detected academic intent`);
    } else {
      console.log(`❌ No academic intent detected`);
    }
  }
  
  return hasAcademicIntent;
}

/**
 * Detect personal/casual language that should block AI responses
 */
function detectPersonalCasual(message, isDevelopment) {
  // Personal/casual keywords (very targeted to avoid blocking academic questions)
  const personalKeywords = [
    // Family references
    'dad', 'mom', 'father', 'mother', 'parents', 'family', 'brother',
    'sister', 'friend', 'buddy', 'bro', 'sis', 'girlfriend', 'boyfriend',
    
    // Strong emotional/feeling words (non-academic)
    'feeling bad', 'feel sad', 'felt angry', 'emotions', 'mood', 'happy birthday',
    'angry at', 'excited about', 'tired of', 'stressed out', 'worried about',
    'anxious about', 'depressed',
    
    // Casual expressions
    'lol', 'lmao', 'haha', 'hehe', 'omg', 'wtf', 'btw', 'fyi',
    'tbh', 'imo', 'afaik', 'ttyl', 'brb', 'gtg', 'nvm', 'jk',
    
    // Social pleasantries (only in non-academic contexts)
    'thank you everyone', 'thx', 'ty', 'welcome', 'no problem', 'np',
    
    // Greetings/farewells (simple ones)
    'hello there', 'hi everyone', 'hey guys', 'sup', 'goodbye', 'bye bye',
    'later', 'good night', 'good morning', 'good afternoon', 'good evening',
    
    // Personal activities
    'eating', 'sleeping', 'watching tv', 'playing games', 'hanging out',
    'chilling', 'relaxing', 'partying', 'dating', 'shopping',
    'working out', 'exercising', 'cooking', 'cleaning',
    
    // Agreement/disagreement (only strong personal opinions without academic context)
    'totally agree', 'absolutely right', 'exactly right',
    'i think you', 'i believe you', 'i feel like', 'in my opinion', 'personally'
  ];
  
  // Personal phrases (more specific to avoid blocking academic questions)
  const personalPhrases = [
    'how are you', 'how you doing', 'how have you been',
    'whats up', 'what\'s up', 'how\'s it going', 'how is it going',
    'see you later', 'talk to you later', 'catch you later',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'have a good', 'take care', 'stay safe', 'be careful',
    'my family', 'my friends', 'my life', 'my day', 'my weekend',
    'i\'m fine', 'i am fine', 'i\'m good', 'i am good',
    'i\'m okay', 'i am okay', 'doing well', 'doing good',
    'thanks everyone', 'thank you everyone', 'thanks all'
  ];
  
  // Check for personal keywords
  const hasPersonalKeyword = personalKeywords.some(keyword => 
    message.includes(keyword)
  );
  
  // Check for personal phrases
  const hasPersonalPhrase = personalPhrases.some(phrase => 
    message.includes(phrase)
  );
  
  const isPersonalCasual = hasPersonalKeyword || hasPersonalPhrase;
  
  if (isDevelopment) {
    if (isPersonalCasual) {
      console.log(`❌ Personal/casual language detected - blocking AI response`);
    } else {
      console.log(`✅ No personal/casual language detected`);
    }
  }
  
  return isPersonalCasual;
}

/**
 * Detect math expressions or formulas in text
 */
function detectMathExpression(message, isDevelopment) {
  const mathPatterns = [
    // Basic arithmetic
    /\d+\s*[+\-*/]\s*\d+/,
    // Algebraic expressions
    /[x-z]\s*[+\-*/]\s*\d+/,
    /\d+\s*[x-z]/,
    // Calculus expressions
    /derivative|integral|limit|d\/dx|∫|∆|∂/i,
    // Common math terms
    /solve|equation|formula|calculate|compute|find\s+(x|y|z)/i,
    // Math symbols
    /[√∑∏∆∂∫]/,
    // Fractions and exponents
    /\d+\/\d+|\d+\^\d+|\d+\*\*\d+/,
    // Geometric terms with numbers
    /(area|volume|perimeter|circumference).*\d+/i
  ];
  
  const hasMath = mathPatterns.some(pattern => pattern.test(message));
  
  if (isDevelopment && hasMath) {
    console.log(`✅ Math expression detected`);
  }
  
  return hasMath;
}

/**
 * Detect code patterns in text
 */
function detectCodePattern(message, isDevelopment) {
  const codePatterns = [
    // Function calls
    /\w+\([^)]*\)/,
    // Variable assignments
    /\w+\s*[=:]\s*\w+/,
    // Code keywords
    /\b(function|var|let|const|if|else|for|while|class|def|return|import|export)\b/i,
    // HTML/XML tags
    /<\/?[a-z][\s\S]*>/i,
    // CSS selectors
    /[.#]\w+\s*{|:\s*\w+;/,
    // Programming languages mentioned
    /\b(javascript|python|java|cpp|html|css|react|node|sql)\b/i,
    // Code symbols
    /[{}[\];]/,
    // Error messages
    /error.*line|syntax.*error|undefined.*variable/i
  ];
  
  const hasCode = codePatterns.some(pattern => pattern.test(message));
  
  if (isDevelopment && hasCode) {
    console.log(`✅ Code pattern detected`);
  }
  
  return hasCode;
}

/**
 * Detect educational keywords that suggest learning intent
 */
function detectEducationalKeywords(message, isDevelopment) {
  const educationalKeywords = [
    // Learning verbs
    'learn', 'study', 'understand', 'teach', 'explain', 'show',
    'demonstrate', 'clarify', 'illustrate', 'elaborate',
    
    // Question words for learning
    'what is', 'what are', 'how do', 'how does', 'why do', 'why does',
    'when do', 'where do', 'which is', 'who is',
    
    // Academic actions
    'solve', 'calculate', 'compute', 'analyze', 'evaluate', 'determine',
    'find', 'prove', 'derive', 'show that', 'verify',
    
    // Educational phrases
    'can you help', 'need help', 'help me', 'i need to', 'how to',
    'step by step', 'walk through', 'break down', 'in detail',
    
    // Academic subjects (basic)
    'math', 'science', 'history', 'english', 'physics', 'chemistry',
    'biology', 'programming', 'coding', 'algorithm'
  ];
  
  const messageWords = message.toLowerCase();
  const hasEducational = educationalKeywords.some(keyword => 
    messageWords.includes(keyword)
  );
  
  if (isDevelopment && hasEducational) {
    console.log(`✅ Educational keywords detected`);
  }
  
  return hasEducational;
}

module.exports = {
  shouldAIRespond,
  handleSoloMode,
  handleMultiUserMode,
  checkExplicitAIMention,
  detectQuestion,
  detectAcademicIntent,
  detectPersonalCasual,
  detectMathExpression,
  detectCodePattern,
  detectEducationalKeywords
};