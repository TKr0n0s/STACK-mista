import pino from 'pino'

export const logger = pino({
  redact: ['email', 'name', 'weight', 'foods_to_avoid', 'ip', 'user_agent'],
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})
