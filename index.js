const express = require('express');
const app = express();
const { v4 } = require('uuid');
const dbRepo=require('./dbRepository');
const functions=require('./functions');
const qr=require('qrcode');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var axios = require('axios');
const cors = require('cors');
const { createLogger, format, transports } = require("winston");

const cscUrl='http://localhost:9000'
var bankIdentifier="123456";
const bankFrontUrl='http://localhost:3002';
const pccUrl='http://localhost:9000';
const port=8000;
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};
app.use(cors({
    origin: '*'
}));
const logger = createLogger({
  levels:logLevels,
  transports: [new transports.File({ filename: "file.log" })],
  exceptionHandlers: [new transports.File({ filename: "exceptions.log" })],
  rejectionHandlers: [new transports.File({ filename: "rejections.log" })],
});
app.listen(port, () => {
  console.log(`Server Started on ${port}`);
  logger.info(`Server started on ${port}. Time: ${new Date()}`);
});

app.get('/get-payment-info',jsonParser,async(req,res)=>
{
  console.log('get-payment-info');
  console.log(req.query);
  if(req.query.id==='')
  {
    res.send({successful:false,})
  }
  
  const payment=await dbRepo.getPaymentRequestByPaymentId(req.query.id);
  if(payment===null)
  {
    res.send({successful:false});
  }
  console.log(payment);
  const merchant=await dbRepo.getAccountById(payment.merchant_id);
  merchant.balance=0;
  merchant.exp_date=0;
  const qrObject={
    c:'USD',
    a:payment.amount,
    m:merchant.pan,
    n:merchant.name
  };
  logger.info(`Sending payment ${req.query.id} data. Time: ${new Date()}`);

  const qrCode=await functions.generateQr(qrObject);  
  res.send({successful:true,payment:payment,merchant_account:merchant.pan,merchant_name:merchant.name,qr:qrCode});
});
app.post('/start-payment', jsonParser, async(req, res) =>
{
  logger.info(`Payment started. Time: ${new Date()}`);
  console.log("start payment");
  const payment_info=req.body;
  try{
    const payment={
      payment_id:payment_info.merchant_order_id,
      id:v4(),
      merchant_id: payment_info.merchant_id,
      timestamp:payment_info.merchant_timestamp,
      amount:Number(payment_info.amount),
      completed:false,
      success_url:payment_info.success_url,
      failed_url:payment_info.failed_url,
       error_url:payment_info.error_url
    }
    const data= await dbRepo.addPaymentRequest(payment);


  console.log(data);
  const resp={
    url:bankFrontUrl,
    paymentId:payment.id,
  }
  logger.info(`Sending bank url. Time: ${new Date()}`);
  res.send(resp);

  }
  catch(e)
  {
    logger.info(`Payment ${payment.payment_id} failed. Time: ${new Date()}`);
    console.log(e);
  }
});
app.post('/start-payment-qr', jsonParser, async(req, res) =>
{
  console.log("start payment qr");
  logger.info(`Started qr payment. Time: ${new Date()}`);
  const payment_info=req.body;
  try{
    const payment={
      payment_id:payment_info.payment_id,
      id:v4(),
      merchant_id: payment_info.merchant_id,
      timestamp:payment_info.merchant_timestamp,
      amount:Number(payment_info.amount),
      completed:false,
      success_url:payment_info.success_url,
      failed_url:payment_info.failed_url,
       error_url:payment_info.error_url
    }
    console.log(payment);
    const data= await dbRepo.addPaymentRequest(payment);
  console.log(data);
  logger.info(`Sending bank url. Time: ${new Date()}`);
  const resp={
    url:`${bankFrontUrl}/qr`,
    paymentId:payment.id,
  }
  res.send(resp);
  }
  catch(e)
  {
    console.log(e);
  }


});
app.get('/get-payment', jsonParser, async(req, res) => 
{
    const paymentId =  req.query.paymentId; // iz url izvuci id
    try{
      const {data, error}= await supabase
      .from('transactions')
      .select('*')
      .eq('id', paymentId)
      res.send();
    }
    catch(e)
    {
      console.log(e);
    }
    
});

app.post('/finish-payment', jsonParser, async(req, res) =>
{
  try{
    console.log(`finish payment: data->\n${JSON.stringify(req.body)}`);
    const pan=req.body.pan;
    const csc=req.body.csc;
    const name=req.body.card_h_name;
    const exp_date=req.body.exp_date;
    const payment_id=req.body.payment_id;
    const amount=await dbRepo.getAmount(payment_id);
    const merchant_id= await dbRepo.getMerchantIdByPaymentId(payment_id);
    const data=await dbRepo.getAccountByPan(pan);
    const timestamp=Date.now();
    const payment_request=await dbRepo.getPaymentRequestByPaymentId(payment_id);
    if(data===null)
    {
      logger.info(`Payment account is from other bank. Sending request to csc. Time: ${new Date()}`);
      console.log('saljemo zahtev csc-u');
      const pccRequestData={
        pan:pan,
        csc:csc,
        card_h_name:name,
        exp_date:exp_date,
        timestamp:timestamp,
        transaction_id:payment_id,
        amount:amount
      };
      const resp= await dbRepo.addTransaction({date:new Date(),id:payment_id,merchant_id:merchant_id,payer_id:null,state:'pending',amount:amount,timestamp:timestamp});//payer_id:null jer mi ne znamo njegov id, samo acc num
      const response=await axios.post(`${cscUrl}/payment-request`,pccRequestData);
      const payment_request=await dbRepo.getPaymentRequestByPaymentId(response.data.acquirerer_id);
      if(response.data.successful)
      {
        logger.info(`Transaction successfull. Adding amount to merchant account. Time: ${new Date()}`);
        console.log('uvecavanje balansa')
        //uvecaj balance
        const merchantAccount = await dbRepo.getAccountById(merchant_id);
        const newBalanceMerchant=merchantAccount.balance+amount;
        const dataMerchant= await dbRepo.updateBalance(merchant_id,newBalanceMerchant);
        console.log(response.transaction_id)
        const date=await dbRepo.updateTransactionState(payment_id,'executed');
        res.send({successful:true,payment_id:payment_request.payment_id,url:payment_request.success_url});
      }
      else
      {
        logger.info(`Transaction unsuccessfull. Csc responded with unsuccessful. Time: ${new Date()}`);
        const date=await dbRepo.updateTransactionState(response.transaction_id,'failed');
        res.send({successful:false,url:payment_request.error_url,payment_id:payment_request.payment_id});

      }
    }
    else//payer is in this bank db
    {
      const account=data;
      logger.info(`Transaction is getting done in this bank. Time: ${new Date()}`);
      if(functions.checkAccountInfo({csc,exp_date,name},account))
        {
          if(account.balance>=amount)
          {
            logger.info(`Transaction successfull. Adding amount to merchant account. Time: ${new Date()}`);
            console.log('ima dovoljno stanja na racunu');
            const data = await dbRepo.getAccountById(merchant_id);
            const merchantAccount=data;
            const newBalancePayer=account.balance-amount;
            const newBalanceMerchant=merchantAccount.balance+amount;
            const dataPayer= await dbRepo.updateBalance(account.id,newBalancePayer);
            const dataMerchant= await dbRepo.updateBalance(merchant_id,newBalanceMerchant);
            ///upis transakcije u bazu
            const resp= await dbRepo.addTransaction({date:new Date(),id:payment_id,merchant_id:merchant_id,payer_id:account.id,state:'executed',amount:amount,timestamp:timestamp})
            const a=await dbRepo.updatePaymentCompleted(payment_id);
            res.send({successful:true,url:payment_request.success_url,payment_id:payment_request.payment_id});
          }
          else{//ako nema dovoljno stanja upisujemo transakciju ali successful=false
            logger.info(`Transaction unsuccessfull. Not enough money on the account. Time: ${new Date()}`);
            console.log('nema dovoljno stanja na racunu');
            const resp= await dbRepo.addTransaction({date:new Date(),id:payment_id,merchant_id:merchant_id,payer_id:account.id,state:'failed',amount:amount,timestamp:timestamp});
            res.send({successful:false,url:payment_request.error_url,payment_id:payment_request.payment_id});
          }
        }
        else
        {
          logger.info(`Invalid payment account data. Time: ${new Date()}`);
          res.send({successful:false,message:'Invalid account info'})
        }
    }
  }
  catch(e)
  {
    res.send({successful:false,url:payment_request.failed_url,payment_id:payment_request.payment_id});
  }
  
  // Na sajtu banke prodavca, kupac unosi PAN, security code, card holder name i datum do kada kartica važi.
  // Vrši se provera podataka.
  // Ukoliko je banka prodavca ista kao i banka kupca, vrši se provera raspoloživih sredstava na računu kupca,
  // rezervišu se sredstva, ukoliko postoje, i dalji tok skače na korak 7.
  // U suprotnom, banka prodavca generiše ACQUIRER_ORDER_ID (ID transakcije - tip Number(10)) i  ACQUIRER_TIMESTAMP
  // i zajedno sa podacima o kartici šalje zahtev ka PCC.
  //Odlazni podaci-zahtjev servicu kartica
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   pan,
  //   csc,
  //   card_h_name,
  //   exp_date
  // }


  //7. Banka prodavca prosleđuje podatke o stanju transakcije,
  //uz MERCHANT_ORDER_ID, ACQUIRER_ORDER_ID, ACQUIRER_TIMESTAMP i PAYMENT_ID PSP-u.
  //Kupac se prebacuje na stranicu koja prikazuje status izvršavanja transakcije (uspeh, neuspeh, greška).
  //U slučaju uspeha, dobija pristup uslugama koje je kupio.
  //Odlazni podaci
  // {
  //   merchant_order_id, //odozgo iz najgornje metode
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   payment_id,// +podaci o uspjehu/neuspjehu transakcije
  // }
});
app.post('/extern-payment-request', jsonParser, async(req, res) =>
{
  //azurirati podatke o korisniku i kreirati u tabelu transakciju da se desila
  logger.info(`External payment request. Time: ${new Date()}`);
  const info=req.body;
  const info2={
    csc:info.csc,
    name:info.card_h_name,
    exp_date:info.exp.date
  }
  info.newTimestamp=Date.now();
  info.id=v4();
  const data=dbRepo.getAccountByPan(info.pan);
  if(data.length>0)
  {
    if(functions.checkAccountInfo(info2,data[0]))
    {
      if(data[0].balance>=info.amount)
      {
        logger.info(`Payment successful. Time: ${new Date()}`);
        const data=dbRepo.updateBalance(data[0].id,data[0].balance-info.amount);
        const resp= await addTransaction({date:new Date(),id:info.id,merchant_id:'',payer_id:data[0].id,successful:'executed',amount:info.amount,timestamp:info.newTimestamp});
        res.send({successful:true,acquirerer_id:info.transaction_id,acquirerer_timestamp:info.timestamp,issuer_id:info.id,issuer_timestamp:info.newTimestamp});
      }
      else{//ako nema dovoljno stanja upisujemo transakciju ali successful=false
        logger.info(`Payment unsuccessful. Not enough balance. Time: ${new Date()}`);
        const resp= await addTransaction({date:new Date(),id:info.id,merchant_id:'',payer_id:account.id,successful:'failed',amount:info.amount,timestamp:info.newTimestamp});
        res.send({successful:false,acquirerer_id:info.transaction_id,acquirerer_timestamp:info.timestamp,issuer_id:info.id,issuer_timestamp:info.newTimestamp});
      }
    }
  }
});