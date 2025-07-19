const axios = require('axios');
const endpoint='http://localhost:4001'
// Utility delay (optional, for spacing requests)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
module.exports.farmerOfferCreated = async (req, res) => {
    // const { req_id, seller_id } = req.body;
    const req_id= "67e1524fad7ee1581f97ac64"// mustard
    // const  req_id="685a79ba90d964f34a7bcca5" // sunflower

    // const seller_id= "67e3dcfc16a8db907254eaec" // swaraj
   const seller_id= "67e38f0516a8db907254c63a" // farmer consortium
  //  const seller_id= "67ee2a3e07654b69eabda370", // hafed
    const payload = {
      // "associateName":"SWARAJ FEDERATION OF MULTIPURPOSE COOP SOCIETY LTD"
      "associateName":"FARMERS CONSORTIUM FOR AGRICULTURE &ALLIED SEC HRY"
      // "associateName":"HAFED"
  };
    let count = 1;
    let status = true;
    while (status) {
        console.log(`\n🔄 Iteration ${count} - Fetching farmer...`);
    
        try {
          const getResponse = await axios.post(
           ` ${endpoint}/v1/ekhrid/associate/associateFarmerList`,
             payload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          const farmer_data = getResponse.data?.data[0]?.farmer_data;
          const qtyOffered = getResponse.data?.data[0]?.qtyOffered
    console.log("farmer_data",getResponse)
          if (!farmer_data || farmer_data.length === 0) {
            console.log('✅ No more farmer data');
            status=false
            return res.json({ success: true,farmer_data, message: ' No more farmer data.' });
          }
          const postPayload = {
            req_id,
            seller_id,
            farmer_data,
            qtyOffered
          };
          console.log(`\n🔄 Iteration ${count} - createOfferOrder...`);
          const postResponse = await axios.post(
            `${endpoint}/v1/ekhrid/associate/createOfferOrder`,
            postPayload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          console.log(`✅ Farmer Offer  created (iteration ${count}):`, postResponse.data?.message || 'Success');
          count++;
          await delay(500); // Wait before next loop
    
        } catch (error) {
          console.error('❌ Error:', error.response?.data || error.message);
          status=false
          return res.json({ success: false, message: 'Error occurred', error: error.message });
        }
      }
      return res.json({ success: true, message: 'Job completed. No more farmer data.' });
};

module.exports.batchCreated = async (req, res) => {
    // const { req_id, seller_id } = req.body;
    const req_id= "67e1524fad7ee1581f97ac64"// mustard
    // const  req_id="685a79ba90d964f34a7bcca5" // sunflower

     // const seller_id= "67e3dcfc16a8db907254eaec" // swaraj
   const seller_id= "67e38f0516a8db907254c63a" // farmer consortium
   //  const seller_id= "67ee2a3e07654b69eabda370", // hafed
    const payload = {
        req_id: req_id,
        seller_id: seller_id,
    };
    let count = 1;
    let status = true;
    while (status) {
        console.log(`\n🔄 Iteration ${count} - Fetching batch data...`);
    
        try {
          const getResponse = await axios.post(
           ` ${endpoint}/v1/ekhrid/batch/getFarmerOrders`,
             payload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          const farmerData = getResponse.data?.data[0]?.farmerData;
    
          if (!farmerData || farmerData.length === 0) {
            console.log('✅ No more farmer order data.');
            status=false
            return res.json({ success: true,farmerData, message: 'No more farmer order data.' });
          }
          
          const postPayload = {
            req_id,
            seller_id,
            truck_capacity: 545,
            farmerData,
          };
          console.log(`\n🔄 Iteration ${count} - creating batch data...`);
          const postResponse = await axios.post(
            `${endpoint}/v1/ekhrid/batch/create-batch`,
            postPayload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          console.log(`✅ Batch created (iteration ${count}):`, postResponse.data?.message || 'Success');
          count++;
          await delay(500); // Wait before next loop
    
        } catch (error) {
          console.error('❌ Error:', error.response?.data || error.message);
          status=false
          return res.json({ success: false, message: 'Error occurred', error: error.message });
        }
       
      }
      return res.json({ success: true, message: 'Job completed. No more batch data.' });
};

module.exports.paymentCreated = async (req, res) => {
   // const { req_id, seller_id } = req.body;
   const req_id= "67e1524fad7ee1581f97ac64"// mustard
   // const  req_id="685a79ba90d964f34a7bcca5" // sunflower

    // const seller_id= "67e3dcfc16a8db907254eaec" // swaraj
  const seller_id= "67e38f0516a8db907254c63a" // farmer consortium
  //  const seller_id= "67ee2a3e07654b69eabda370", // hafed
   const payload = {
       req_id: req_id,
       seller_id: seller_id,
   };
    let count = 1;
    let status = true;
    while (status) {
        console.log(`\n🔄 Iteration ${count} - Fetching batch ...`);
    
        try {
          const getResponse = await axios.post(
           ` ${endpoint}/v1/ekhrid/order/getBatches`,
             payload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          const batchIds = getResponse.data?.data?.batchIds || [];
    
          if (!batchIds || batchIds.length === 0) {
            console.log('✅ No more batch data. Job completed.');
            status=false
            return res.json({ success: true, message: 'Job completed. No more batch data.' });
          }
    
          const postPayload = {
            req_id,
            seller_id,
            batchIds,
          };
    
          const postResponse = await axios.post(
            `${endpoint}/v1/ekhrid/order/create-order`,
            postPayload,
            { headers: { 'Content-Type': 'application/json' } }
          );
    
          console.log(`✅ Payment created (iteration ${count}):`, postResponse.data?.message || 'Success');
          count++;
          await delay(500); // Wait before next loop
    
        } catch (error) {
          console.error('❌ Error:', error.response?.data || error.message);
          status=false
          return res.json({ success: false, message: 'Error occurred', error: error.message });
        }
      }
      return res.json({ success: true, message: 'Payment created completed. No more batch data.' });
};
