import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getTelegramMemberCount(url: string): Promise<number | null> {
    try {
        // Ensure URL is a valid Telegram URL
        if (!url.includes('t.me/')) return null;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 5000, // 5 second timeout
        });

        const $ = cheerio.load(response.data);

        // Look for the member count element
        // Usually in <div class="tgme_page_extra">123 members</div>
        // Or <div class="tgme_page_extra">123 subscribers</div>
        const extraText = $('.tgme_page_extra').text().trim();

        if (!extraText) return null;

        // Extract the number
        // Formats: "10 000 members", "10 000 subscribers", "1.2k members" (rarely on web view, usually full number)
        // Actually web view usually shows "10 000 members" or "10 000 subscribers"

        // Remove non-numeric characters except for 'k', 'm', '.', ','
        // But usually it's just spaces as thousands separators

        // Let's look for the pattern "X members" or "X subscribers"
        const match = extraText.match(/^([\d\s.,]+)\s*(members|subscribers)/i);

        if (match && match[1]) {
            // Remove spaces and commas
            const numberStr = match[1].replace(/[\s,]/g, '');
            const count = parseInt(numberStr, 10);
            return isNaN(count) ? null : count;
        }

        return null;
    } catch (error) {
        console.error('Error fetching Telegram member count:', error);
        return null;
    }
}
