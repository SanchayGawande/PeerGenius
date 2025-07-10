// Final comprehensive test
require('dotenv').config();
const axios = require('axios');
const io = require('socket.io-client');

async function runFinalTests() {
  console.log('🎯 PeerGenius Final Test Suite');
  console.log('=' .repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  function test(description, condition) {
    totalTests++;
    if (condition) {
      console.log(`✅ ${description}`);
      passedTests++;
    } else {
      console.log(`❌ ${description}`);
    }
  }
  
  const baseURL = 'http://localhost:5050';
  
  // Test 1: Server Health
  console.log('\n🔍 Testing Server Health...');
  try {
    const response = await axios.get(`${baseURL}/api/health`);
    test('Server health check', response.data.status === 'OK');
  } catch (error) {
    test('Server health check', false);
  }
  
  // Test 2: Authentication Protection
  console.log('\n🔐 Testing Authentication Protection...');
  try {
    await axios.get(`${baseURL}/api/threads`);
    test('Authentication protection', false);
  } catch (error) {
    test('Authentication protection', error.response?.status === 401);
  }
  
  // Test 3: Socket.IO Connection
  console.log('\n📡 Testing Socket.IO Connection...');
  const socket = io(baseURL, { timeout: 5000 });
  
  await new Promise((resolve) => {
    socket.on('connect', () => {
      test('Socket.IO connection', true);
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', () => {
      test('Socket.IO connection', false);
      resolve();
    });
    
    setTimeout(() => {
      test('Socket.IO connection', false);
      resolve();
    }, 6000);
  });
  
  // Test 4: Direct AI API Connection
  console.log('\n🤖 Testing AI API Connection...');
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: 'Say "test successful"' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    test('AI API connection', response.data.choices[0].message.content.includes('test successful'));
  } catch (error) {
    test('AI API connection', false);
  }
  
  // Test 5: Content Parsing Functions
  console.log('\n📄 Testing Content Parsing Functions...');
  try {
    const contentController = require('./controllers/contentGenerationController');
    
    // Test quiz parsing
    const quizContent = `
1. What is 2+2?
A) 3
B) 4
C) 5
Answer: B) 4
Explanation: Simple addition
`;
    const questions = await contentController.parseQuizContent(quizContent);
    test('Quiz parsing', questions.length === 1 && questions[0].question === 'What is 2+2?');
    
    // Test practice problems parsing
    const practiceContent = `
Problem 1: Solve x + 2 = 5
Solution: x = 3
Steps:
1. Subtract 2 from both sides
2. x = 5 - 2 = 3
Hint: Use inverse operations
`;
    const problems = await contentController.parsePracticeProblems(practiceContent);
    test('Practice problems parsing', problems.length === 1 && problems[0].problem === 'Solve x + 2 = 5');
    
    // Test quality validation
    const qualityScore = await contentController.calculateContentQuality('# Test\n\nThis is a test with examples like this one.');
    test('Content quality calculation', qualityScore > 0 && qualityScore <= 100);
    
  } catch (error) {
    test('Content parsing functions', false);
  }
  
  // Test 6: AI Decision Engine
  console.log('\n🧠 Testing AI Decision Engine...');
  try {
    const { shouldAIRespond } = require('./utils/aiDecisionEngine');
    
    const mathQuestion = shouldAIRespond('What is the derivative of x^2?', 2, {});
    const decision = typeof mathQuestion === 'boolean' ? mathQuestion : mathQuestion.shouldRespond;
    test('AI decision engine - math question', decision === true);
    
    const greeting = shouldAIRespond('Hello everyone!', 3, {});
    const greetingDecision = typeof greeting === 'boolean' ? greeting : greeting.shouldRespond;
    test('AI decision engine - greeting', greetingDecision === false);
    
  } catch (error) {
    test('AI decision engine', false);
  }
  
  // Test 7: API Proxy
  console.log('\n🔗 Testing API Proxy...');
  try {
    const response = await axios.get('http://localhost:5173/api/health');
    test('API proxy functionality', response.data.status === 'OK');
  } catch (error) {
    test('API proxy functionality', false);
  }
  
  // Results Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! PeerGenius is ready for use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
  
  console.log('\n🚀 PeerGenius Testing Complete!');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend: http://localhost:5050');
  console.log('API Health: http://localhost:5050/api/health');
  
  process.exit(0);
}

runFinalTests().catch(console.error);