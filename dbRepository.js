const { createClient, FunctionsError } =require("@supabase/supabase-js");
const bcrypt = require('bcrypt');

const prompt = require("prompt-sync")({ sigint: true });
var supabaseUrl = 'https://qxvuqmzydpwwqvldclve.supabase.co'
var supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dnVxbXp5ZHB3d3F2bGRjbHZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3MjE1NjAwNCwiZXhwIjoxOTg3NzMyMDA0fQ.P5kK_j5vTzKzNcEZOVEkOqIMmAetTFEND7Q7PCTYTnI"
var supabase = createClient(supabaseUrl, supabaseKey)
exports.getMerchantIdByPaymentId= async function (payment_id)
{
  const {data,error} = await supabase
            .from('payment-requests')
            .select()
            .eq('id',payment_id);
            console.log(error);
  const merchant_id=data[0].merchant_id;
  return merchant_id;
}
exports.getAmount= async function (payment_id)
{
  const {data,error} = await supabase
            .from('payment-requests')
            .select()
            .eq('id',payment_id);
  const amount=data[0].amount;
  return amount;
}
exports.getAccountByPan=async function(pan)
{
  
  
  //var encPan=null;
  // bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
  //   // Store hash in your password DB.
  //   encPan=hash
  // });
    let {data,error}= await supabase
    .from('bank-accounts')
    .select()
    .eq('pan',pan);
    if(data.length>0)
    return data[0];
    else return null;
}
exports.getPaymentRequestByPaymentId=async function(id)
{
    let {data,error}= await supabase
    .from('payment-requests')
    .select()
    .eq('id',id);
    
    if(data.length>0)
    return data[0];
    else return null;
}
exports.getAccountById=async function(id)
{
    const {data,error} = await supabase
            .from('bank-accounts')
            .select()
            .eq('id',id);
            if(data.length>0)
            return data[0];
            else return null;
}
exports.addPaymentRequest=async function(paymentRequest)
{
    const {data,error}= await supabase
    .from('payment-requests')
    .insert(
      paymentRequest
      )
  .single();
  return data;
}
exports.addTransaction=async function(transaction)
{
  const {data,error}=await supabase
    .from('transactions')
    .insert(transaction)
    .single();
  return data;
}
exports.updateBalance=async function(id,balance)
{
    const {data,error}= await supabase
          .from('bank-accounts')
          .update({balance:balance})
          .eq('id',id);
          return data;
}
exports.setupDB=function()
{
    supabaseUrl=prompt("supabaseUrl: ");
    supabaseKey=prompt("supabaseKey: ");
    supabase = createClient(supabaseUrl, supabaseKey)
}
exports.updateTransactionState=async function(id,state)
{
    const {data,error}= await supabase
          .from('transactions')
          .update({state:state})
          .eq('id',id);
          return data;
}
exports.updatePaymentCompleted=async function(id)
{
    const {data,error}= await supabase
          .from('payment-requests')
          .update({completed:true})
          .eq('id',id);
    console.log(data);
    console.log(error)
          return data;
}