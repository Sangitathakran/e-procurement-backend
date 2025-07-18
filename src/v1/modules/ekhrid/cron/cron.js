const axios = require('axios');

// Static payload - customize as needed
const payload = {
    req_id: "67e1524fad7ee1581f97ac64",
    seller_id: "67ee2a3e07654b69eabda370",
};

// Utility delay (optional, for spacing requests)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports.batchCreated = async () => {
    let count = 1;
    let status = true;
    while (status) {
        console.log(`\n🔄 Iteration ${count} - Fetching farmer orders...`);

        try {
            const getResponse = await axios.post(
                'http://localhost:4002/v1/ekhrid/batch/getFarmerOrders',
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            const farmerData = getResponse.data?.data?.farmerData;

            if (!farmerData || farmerData.length === 0) {
                console.log('✅ No more farmer data. Job completed.');
                status = false;
                break;
            }

            // Sample: use fixed truck capacity or dynamic value
            const postPayload = {
                ...payload,
                truck_capacity: 545,
                farmerData,
            };

            const postResponse = await axios.post(
                'http://localhost:4002/v1/ekhrid/batch/create-batch',
                postPayload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            console.log(`✅ Batch created (iteration ${count}):`, postResponse.data?.message || 'Success');

            count++;
            await delay(500); // Optional: wait 2s between loops

        } catch (err) {
            status = false;
            console.error('❌ Error:', err?.response?.data || err.message);
            break; // stop on error (or continue if desired)
        }
    }
};

