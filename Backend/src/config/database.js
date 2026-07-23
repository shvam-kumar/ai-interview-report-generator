const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]); // force Node's resolver to use working DNS

async function connectToDB() {
  try{ 
    await mongoose.connect(process.env.MONGO_URI) ;
   console.log("Database connected successfully");
 } catch(error){
    console.error("Database connection failed:", error);
  }

}
module.exports = connectToDB