const axios = require('axios');

const SHOP = 'quick-start-336d2506.myshopify.com';  // your store domain here
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const NAMESPACE = 'custom';
const KEY = 'test_access_token';

async function getCurrentToken() {
    try {
        const res = await axios.get(`https://${SHOP}/admin/api/2023-07/metafields.json`, {
            headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN },
            params: { namespace: NAMESPACE, key: KEY }
        });
        const metafields = res.data.metafields;
        if (metafields.length > 0) {
            return metafields[0].value;
        } else {
            console.log('No existing metafield found.');
            return null;
        }
    } catch (err) {
        console.error('Failed to get current token:', err.response?.data || err.message);
        return null;
    }
}

async function refreshInstagramToken(currentToken) {
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
    try {
        const res = await axios.get(refreshUrl);
        return res.data.access_token;  // new refreshed token
    } catch (err) {
        console.error('Failed to refresh Instagram token:', err.response?.data || err.message);
        return null;
    }
}

async function upsertMetafield(newToken) {
    try {
        const res = await axios.get(`https://${SHOP}/admin/api/2023-07/metafields.json`, {
            headers: { 'X-Shopify-Access-Token': ACCESS_TOKEN },
            params: { namespace: NAMESPACE, key: KEY }
        });
        const metafields = res.data.metafields;

        if (metafields.length > 0) {
            const metafieldId = metafields[0].id;
            await axios.put(`https://${SHOP}/admin/api/2023-07/metafields/${metafieldId}.json`, {
                metafield: {
                    id: metafieldId,
                    value: newToken,
                    type: "single_line_text_field"
                }
            }, {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Metafield updated');
        } else {
            await axios.post(`https://${SHOP}/admin/api/2023-07/metafields.json`, {
                metafield: {
                    namespace: NAMESPACE,
                    key: KEY,
                    value: newToken,
                    type: "single_line_text_field",
                    owner_resource: "shop"
                }
            }, {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Metafield created');
        }
    } catch (err) {
        console.error('Failed to upsert metafield:', err.response?.data || err.message);
    }
}

async function main() {
    console.log('Fetching current Instagram token from Shopify metafield...');
    const currentToken = await getCurrentToken();

    if (!currentToken) {
        console.error('No current Instagram token found. Exiting.');
        return;
    }

    console.log('Refreshing Instagram token...');
    const refreshedToken = await refreshInstagramToken(currentToken);

    if (!refreshedToken) {
        console.error('Failed to refresh Instagram token. Exiting without updating metafield.');
        return;
    }

    console.log('Updating Shopify metafield with refreshed token...');
    await upsertMetafield(refreshedToken);

    console.log('Done.');
}

main();