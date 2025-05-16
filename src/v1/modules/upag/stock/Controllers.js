module.exports.getStockData = async (req, res) => {
    try{
        return res.status(200).json({ message: "Dummy response from getStockData" });
    
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}