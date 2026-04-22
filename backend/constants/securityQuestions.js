/** Must match frontend `SECURITY_QUESTION_OPTIONS` (dropdown values). */
const ALLOWED_SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  'In which city were you born?',
  "What is your mother's maiden name?",
  'What was the name of your first pet?',
  'What was your childhood nickname?',
  'What is the last name of your favorite teacher?',
  'What was the brand of your first mobile phone?',
  'What street did you grow up on?',
];

function isAllowedSecurityQuestion(text) {
  const q = typeof text === 'string' ? text.trim() : '';
  return ALLOWED_SECURITY_QUESTIONS.includes(q);
}

module.exports = {
  ALLOWED_SECURITY_QUESTIONS,
  isAllowedSecurityQuestion,
};
