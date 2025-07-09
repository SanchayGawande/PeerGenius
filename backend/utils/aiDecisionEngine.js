/**
 * 🧠 Intelligent AI Response Decision Engine
 * Context-aware system for determining when AI should respond in multi-user threads
 */

/**
 * Main decision function for AI response logic
 * @param {string} messageText - The message content to analyze
 * @param {number} participantCount - Number of participants in the thread
 * @returns {boolean} - Whether AI should respond to this message
 */
function shouldAIRespond(messageText, participantCount) {
  const message = messageText.toLowerCase().trim();
  
  // Development mode logging (can be disabled in production)
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log(`\n🔍 AI DECISION ENGINE`);
    console.log(`👥 Participants: ${participantCount}`);
    console.log(`💬 Message: "${messageText}"`);
  }
  
  // Rule 1: Solo mode - AI always responds
  if (participantCount === 1) {
    if (isDevelopment) {
      console.log(`✅ SOLO MODE: AI will respond (only 1 participant)`);
    }
    return true;
  }
  
  // Rule 2: Multi-user mode - intelligent context analysis
  if (isDevelopment) {
    console.log(`🚨 MULTI-USER MODE: ${participantCount} participants - analyzing context...`);
  }
  
  // Check for explicit AI mentions (legacy support)
  const hasExplicitAIMention = checkExplicitAIMention(message, isDevelopment);
  if (hasExplicitAIMention) {
    return true;
  }
  
  // Check if message appears to be a question
  const isQuestion = detectQuestion(message, isDevelopment);
  
  // Check for academic intent
  const hasAcademicIntent = detectAcademicIntent(message, isDevelopment);
  
  // Check for personal/casual language (should block AI)
  const isPersonalCasual = detectPersonalCasual(message, isDevelopment);
  
  // Decision logic for multi-user mode
  // Academic context can override personal detection if it's a clear academic question
  const isAcademicQuestion = isQuestion && hasAcademicIntent;
  const shouldRespond = (isAcademicQuestion) || (hasAcademicIntent && !isPersonalCasual);
  
  if (isDevelopment) {
    if (isAcademicQuestion) {
      console.log(`✅ Academic question detected - overriding personal language filter`);
    }
    console.log(`${shouldRespond ? '✅' : '❌'} AI RESPONSE ${shouldRespond ? 'ALLOWED' : 'BLOCKED'}`);
  }
  
  return shouldRespond;
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
  // Question patterns
  const questionStarters = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'can you', 'could you', 'would you', 'do you', 'does',
    'is', 'are', 'will', 'should', 'must'
  ];
  
  // Check if starts with question words
  const startsWithQuestion = questionStarters.some(starter => 
    message.startsWith(starter + ' ') || message.startsWith(starter + "'")
  );
  
  // Check if ends with question mark
  const endsWithQuestionMark = message.endsWith('?');
  
  const isQuestion = startsWithQuestion || endsWithQuestionMark;
  
  if (isDevelopment) {
    if (isQuestion) {
      if (startsWithQuestion) {
        console.log(`✅ Inferred as a question (starts with question word)`);
      }
      if (endsWithQuestionMark) {
        console.log(`✅ Inferred as a question (ends with ?)`);
      }
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
  // Academic keywords and phrases
  const academicKeywords = [
    // Action words
    'explain', 'define', 'describe', 'analyze', 'calculate', 'compute',
    'solve', 'derive', 'prove', 'demonstrate', 'show', 'find',
    'determine', 'evaluate', 'interpret', 'summarize', 'compare',
    
    // Subject areas
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'trigonometry',
    'physics', 'chemistry', 'biology', 'science', 'engineering',
    'history', 'literature', 'philosophy', 'psychology', 'economics',
    'statistics', 'probability', 'computer science', 'programming',
    
    // Academic concepts
    'formula', 'equation', 'theorem', 'principle', 'law', 'theory',
    'concept', 'definition', 'derivative', 'integral', 'function',
    'variable', 'constant', 'coefficient', 'hypothesis', 'experiment',
    'research', 'study', 'analysis', 'synthesis', 'conclusion',
    
    // Academic activities
    'homework', 'assignment', 'project', 'exam', 'test', 'quiz',
    'paper', 'essay', 'report', 'presentation', 'lecture', 'class',
    'course', 'curriculum', 'syllabus', 'textbook', 'chapter',
    
    // Educational intent
    'learn', 'understand', 'grasp', 'comprehend', 'master', 'practice',
    'review', 'study', 'memorize', 'remember', 'recall', 'apply',
    'significance', 'importance', 'meaning', 'purpose', 'reason'
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
    
    // Strong emotional/feeling words
    'feeling', 'feel', 'felt', 'emotions', 'mood', 'happy', 'sad',
    'angry', 'excited', 'tired', 'stressed', 'worried', 'anxious',
    'depressed',
    
    // Casual expressions
    'lol', 'lmao', 'haha', 'hehe', 'omg', 'wtf', 'btw', 'fyi',
    'tbh', 'imo', 'afaik', 'ttyl', 'brb', 'gtg', 'nvm', 'jk',
    
    // Social pleasantries (only in non-academic contexts)
    'thank you', 'thx', 'ty', 'welcome', 'no problem', 'np',
    
    // Greetings/farewells
    'hello', 'hi', 'hey', 'sup', 'goodbye', 'bye',
    'later', 'night', 'morning', 'afternoon', 'evening',
    
    // Personal activities
    'eating', 'sleeping', 'watching', 'playing', 'hanging out',
    'chilling', 'relaxing', 'partying', 'dating', 'shopping',
    'working out', 'exercising', 'cooking', 'cleaning',
    
    // Agreement/disagreement (only strong personal opinions)
    'agree', 'disagree', 'exactly', 'totally', 'absolutely',
    'i think', 'i believe', 'i feel', 'in my opinion', 'personally'
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

module.exports = {
  shouldAIRespond,
  checkExplicitAIMention,
  detectQuestion,
  detectAcademicIntent,
  detectPersonalCasual
};