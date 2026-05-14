import cron from 'node-cron';
import { generateCardsForUpcomingMatches } from '../services/cardGenerator.js';
import { settleFinishedEvents } from '../services/settlement.js';

export function startCronJobs(): void {
  // Generate cards every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    console.log('[cron] Generating cards for upcoming matches...');
    const count = await generateCardsForUpcomingMatches();
    console.log(`[cron] Created ${count} new cards`);
  });

  // Settle finished events every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[cron] Settling finished events...');
    await settleFinishedEvents();
  });

  // Generate cards on startup too
  generateCardsForUpcomingMatches().then(n => console.log(`[startup] Created ${n} cards`)).catch(console.error);
}
