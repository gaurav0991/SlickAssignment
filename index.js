const express = require('express');
const pool = require('./db'); // Adjust the path if necessary
const redisClient = require('./redis-client'); // Adjust the path if necessary
const app = express();
const PORT = process.env.PORT || 3000;
const { faker } = require('@faker-js/faker');
const axios=require("axios")

//caching implemented

app.use(express.json());

// Pagination endpoint with caching
app.get('/api/records', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const cacheKey = `records:${page}:${limit}`;

  try {
    // Try fetching the result from Redis first
        const cachedData=await redisClient.get(cacheKey)
        if(cachedData){
          return res.json(JSON.parse(cachedData))
        }

        // If not found in cache, query the database
        const { rows, rowCount } = await pool.query(
          'SELECT * FROM transactions ORDER BY TransactionID LIMIT $1 OFFSET $2',
          [limit, offset]
        );

         redisClient.setEx(cacheKey, 3600, JSON.stringify({
          page,
          limit,
          total: rowCount,
          data: rows,
        }));

        // Return DB query result to client
        res.json({
          page,
          limit,
          total: rowCount,
          data: rows,
        });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get("/api/user",async (req,res)=>{
  const userId = (req.query.userId) || "";
  const {rows,rowsCount}=await pool.query("Select * from transactions where UserID = $1",[userId])
  return res.json({
    data:rows
  })
})
const endpoints = [
  "/api/potential-users",
  "/api/loyalty-score?userId=037605ea-a7eb-4e29-bf66-c1c43215f19d",
  "/api/top-users",
  // Add more endpoints here if needed
];

app.get('/concurrent-api-calls', async (req, res) => {
  try {
    const responses = await Promise.all(
      Array(10).fill().map(() =>
        Promise.all(
          endpoints.map(endpoint => axios.get(`http://localhost:3000${endpoint}`))
        )
      )
    );

    const responseData = responses.flat().map(response => response.data);
    res.json(responseData);
  } catch (error) {
    console.error("Error making concurrent API calls:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});



app.get("/api/top-users",async(req,res)=>{
  try {
    const {rows,rowsCount}=await pool.query("Select SUM(Amount),UserID from transactions GROUP BY UserID ORDER BY sum DESC LIMIT 1")
    res.json({
      data:rows
    })
  } catch (error) {
    
  }
})


app.get("/api/loyalty-score",async(req,res)=>{
  try {
    const userId = (req.query.userId) || "";
    const cacheKey = `loayal-score:${userId}`;
    const reddisData=await redisClient.get(cacheKey)
    if(reddisData){
      return res.json(JSON.parse(reddisData))
    }
    const {rows,rowsCount}=await pool.query("Select * from transactions where UserID = $1",[userId])
    if(rows.length>0)
    rows[0]['loyalty_score']=parseInt(rows[0]['amount'])*rows.length
    await redisClient.set(cacheKey,JSON.stringify({data:rows}))
    res.json({
      data:rows
    })
  } catch (error) {
    res.json({
      data:error.toString()
    })
  }
})




app.get("/api/potential-users",async(req,res)=>{
  try {
    const date=new Date()
    const currMonth=date.getMonth()
    //checking current month and prev month transactions
    // const {rows,rowsCount}=await pool.query("SELECT EXTRACT(MONTH FROM TIMESTAMP) AS Month,array_agg(UserID)  FROM Transactions GROUP BY Month LIMIT 1")
    const {rows,count}=await pool.query("Select UserID,prevMonth,currentmonth from (Select UserID,COUNT(*) AS currentmonth, (Select COUNT(*) from transactions where UserID=t.UserID AND Timestamp > DATE_TRUNC('month',CURRENT_DATE)- INTERVAL '1 month' AND Timestamp < DATE_TRUNC('month',CURRENT_DATE)) AS PrevMonth from transactions t where Timestamp >= DATE_TRUNC('month',CURRENT_DATE) GROUP BY UserID) as usersTransact where currentmonth>prevmonth and prevmonth!=0")
    console.log(rows)
      res.json({
      data:rows
    })
  } catch (error) {
    console.log(error)
    res.json({err:error.toString()})
  }
})


app.post("/api/create-record",async(req,res)=>{
  try {
    const transactionId=10000001;
    const userID=req.body['UserID']
    const amount=req.body['Amount']
    console.log(userID,amount)
    const timestamp=new Date().toISOString()
    const {rows,rowsCount}=await pool.query("INSERT INTO transactions (TransactionID, UserID,Amount, Timestamp) VALUES ($1,$2, $3, $4)",[transactionId,userID,amount,timestamp])
    res.json({
      data:rows
    })
  } catch (error) {
    res.json({err:error.toString()})
  }
})




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
