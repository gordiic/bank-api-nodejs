const express = require('express');
const app = express();

var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

var axios = require('axios');

const cors = require('cors');

const { createClient } =require("@supabase/supabase-js");

const { createLogger, format, transports } = require("winston");

//database pw:12345678910nebojsa
// const supabaseUrl = 'https://kmvvsovezjeqmtobddtk.supabase.co'
// const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdnZzb3ZlemplcW10b2JkZHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzI4NDk1ODEsImV4cCI6MTk4ODQyNTU4MX0.O5kOMXcOJr_mfNqoOOoXCkRpbX_ywd5l51pbhdWjlJI"
const supabase = createClient(supabaseUrl, supabaseKey)
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
app.listen(8000, () => console.log(`Server Started on ${8000}`));


//poslati zahtjev za placanjem sa psp, zapravo odabir nacina placanja preko psp pogadja ovaj endpoint
//kreira se transakcija koja nije zavrsena
//na osnovu merchant_id, merchant_password, amount, merchant_order_id, merchant_timestamp,_ success_url, failed_url, error_url
//kreiraju se payment_url i payment_id
//url je url fronta banke od koga se ponovo salje zahtjev sa payment_id i bek vraca podatke transakcije i popunjava se forma
//PAYMENT_URL (tip URL – String(256)) i PAYMENT_ID (tip Number(10)),

//Dolazni podaci
// {
//   merchant_id,
//   merchant_password,
//   amount,
//   merchant_order_id,
//   merchant_timestamp,
//   success_url,
//   failed_url,
//   error_url
// }
//Odlazni podaci (posebna tabela koju treba prosiriti amountom itd...)
// {
//   payment_url,
//   payment_id
// }
app.get('/start-payment', jsonParser, async(req, res) => 
{
    //provjeriti postoji li taj korisnik banke, da li je okej, ako jeste kreirati transakciju i njen id i cuvati podatke u neku tabelu
    //vratitit url fronta banke i id transakcije
    try{
       
      }
      catch(e)
      {
        console.log(e);
      }
    
});

//kada se popuni forma podacima za placanje gadja se ovaj endpoint
//Dolazni podaci
// {
//   pan,
//   csc,
//   card_h_name,
//   exp_date
// }
app.get('/finish-payment', jsonParser, async(req, res) => 
{
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
    try{
       
      }
      catch(e)
      {
        console.log(e);
      }
    
});

//endpoint koji gadja card service ukoliko je korisnik pripadnik tudje banke
//Dolazni podaci od card service koji su proslijedjeni od banke prodavca
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   pan,
  //   csc,
  //   card_h_name,
  //   exp_date
  // }
  //Banka kupca prihvata zahtev i, ako je ispravan i kupac ima dovoljno novca, vrši se rezervacija sredstava. (vjerovatno se i amount salje)
  // Ocigledno ce trebati da banci javi prva banka da je odradjeno da vise ne bi bilo rezervisano vec izvrseno placanje
  // Ova metoda ce vratiti podatke ukoliko je sve super rezervisano i na osnovu ovog issuer_order_id kada mu ga posalje on ce tu transakciju komitovati
  //Banka kupca prosleđuje rezultat transakcije nazad PCC-u. Odgovor, pored rezultata transakcije, 
  //treba da sadrži i ACQUIRER_ORDER_ID, ACQUIRER_TIMESTAMP, ISSUER_ORDER_ID i ISSUER_TIMESTAMP.
  //Odlazni podaci
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   issuer_order_id,
  //   issuer_timestamp
  // }
app.get('/finish-payment-fromanouther-bank', jsonParser, async(req, res) => 
{
    //azurirati podatke o korisniku i kreirati u tabelu transakciju da se desila

    try{
       
      }
      catch(e)
      {
        console.log(e);
      }
    
});