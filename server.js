const session = require('express-session');
var express = require('express');
var cors = require('cors');
var app = express();
//var databasename = "amtengage";
var databasename = "WXkiWR6HQI";
////https://ms-attendancemonitor.herokuapp.com/CREATE TABLE faculty (Name VARCHAR(255), UID VARCHAR(255) PRIMARY KEY, Mobile VARCHAR(255), Email VARCHAR(255), Password VARCHAR(255), Batch VARCHAR(255))
////https://ms-attendancemonitor.herokuapp.com/INSERT%20INTO%20faculty%20VALUES%20(%22ADMIN%22,%22ADMIN%22,%20%227727884582%22,%20%222018kucp1048@iiitkota.ac.in%22,%20%2273acd9a5972130b75066c82595a1fae3%22)

app.use(cors());
bodyParser = require('body-parser');
const path = require("path");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//////db4free.net server got crashed on 28th Nov 2021, around 5PM, So I used another server

// app.use(express.static(path.join(__dirname, 'www')));
var mysql = require('mysql');
var con = mysql.createConnection({
  //host: "db4free.net",
  host: "remotemysql.com",
  //user: "root15",
  user: "WXkiWR6HQI",
  //password: "shivdeep",
  password: "GrnjbgiN8B",
  database: databasename
});
const uri = "mongodb+srv://server:server@cluster0.akdfp.mongodb.net/sessionsdb?retryWrites=true&w=majority";
const MongoStore = require('connect-mongo');


var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://server:server@cluster0.akdfp.mongodb.net/";


const nodemailer = require('nodemailer');
let fromMail = 'attendancemonitoring.noreply@gmail.com';
let subject = 'Updates from AMS';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: fromMail ,
      pass: '2YfBt6HATcwg5W2'
  }
  });


app.use(
  session({
    secret: 'thisisasecret',
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({
      mongoUrl: uri,
      ttl: 60 * 60 * 8,//8hr
      autoRemove: 'native'
    }),
    cookie: {
    }
  })

);
app.disable('etag');

var crypto = require('crypto');


//////////////////GENERAL GET REQUEST
app.get('/', function (req, res) {
  var sql = "SHOW TABLES;";
  con.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      res.sendStatus(406);
      return;
    }
    else {
      res.send(result);
    }
  });
});
//DEBUGGING USE ONLY
// app.get('/:table', function (req, res) {
//   var sql = req.params.table+";";
//    con.query(sql, function (err, result, fields) {
//      if (err) {
//        console.log(err);
//        res.sendStatus(406);
//        return;
//      }
//      else {
//        res.send(result);
//      }
//    });
//  });

/////Validate calls
var host = "";
var userType = "";
var type_name = "";
function validate_sub() {
  var tbr = true;
  if (userType != type_name) {
    return false;
  }
  console.log("Validate Sub called");

  MongoClient.connect(url, function (err, db) {

    if (err) {
      console.log(err);
      return false;
    } else {
      var dbo = db.db("sessionsdb");
      dbo.collection("sessions").findOne({ _id: host }, function (err, result) {
        if (err) {
          console.log(err);
          return false;
          
        }
        if (result == null) {
          tbr = false;
        }
      });
    }
  }
  );
  return tbr;
}
//////////////////////chk status
app.post('/checkstatus', function (req, res) {
  var body = '';
  req.on('data', function (data) {
    body += data;
  });
  req.on('end', () => {
    var type_name = JSON.parse(body).type;
    console.log("CHK STATUS: " + JSON.parse(body).Sid);
    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        var dbo = db.db("sessionsdb");
        dbo.collection("sessions").findOne({ _id: JSON.parse(body).Sid }, function (err, result) {
          if (err) {
            console.log(err);
            throw err;
          }
          console.log(result);
          if (result == null) {
            res.sendStatus(406);
          } else {
            var type = JSON.parse(result.session).user.type;
            var UID = JSON.parse(result.session).user.UID;
            if (type != type_name) {
              res.status(406).redirect("/logout");
              //penaly with logout
            }
            else {
              if(type=='faculty'){
              var countsql = "SELECT COUNT(*) as CNT FROM faculty WHERE UID='" + UID + "';";
              con.query(countsql, function (err, result, fields) {
                if (err) {
                  console.log(err);
                  res.status(404).redirect("/logout");
                  return;
                }else{
                  if(result[0].CNT==1){
                    res.sendStatus(200);
                  }else res.status(404).redirect("/logout");

                }
              });}
              else
              res.status(200).end();
            }
          }
          db.close();
        });
      }
    }
    );
  });
});
//////////////////List attendance logs
app.get('/attendancelogs/:variable/:variable1', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var user = req.params.variable;
  var Section = req.params.variable1;
  var sql = "SELECT * FROM attendance_logs_" + user + "_" + Section + " ORDER BY TimeStamp DESC;";
  con.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      res.sendStatus(406);
      return;
    }
    else {
      res.status(200).json({
        result: result
      });
    }
  });

});
//////////////////List attendance wise list
app.get('/attendance/:variable', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var TBLNAME = req.params.variable;
  var sql = "SELECT * FROM " + TBLNAME + " ORDER BY UID;";
  con.query(sql, function (err, result, fields) {
    if (err) {
      console.log(err);
      res.sendStatus(406);
      return;
    }
    else {
      res.status(200).json({
        Present_Students_By_UID: result
      });
    }
  });

});
//////////////////List fetch
app.get('/fetchlist/:variable', function (req, res) {


  res.setHeader('Content-Type', 'application/json');
  var variabletbl = req.params.variable;


  if (req.params.variable == 'students') {
    var sql = "SELECT Name, UID, Batch, Mobile, Email FROM " + variabletbl + " ORDER BY Batch, Name, UID;";
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          result: result
        });
      }
    });
  }
  else if (req.params.variable == 'faculty') {
    var sql = "SELECT Name, UID, Email, Mobile FROM " + variabletbl + " WHERE UID != 'ADMIN' ORDER BY Name, UID;";
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          result: result
        });
      }
    });
  }
  else {
    var sql = "SELECT * FROM " + variabletbl + "  ORDER BY 1;";
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          result: result
        });
      }
    });
  }
});

//////////////////student data fetch
app.get('/studentdetails/:UID', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var UID = req.params.UID;
    var sql = "SELECT Name, Email, Batch FROM students WHERE UID='"+UID+"';";
    con.query(sql, function (err, result, fields) {
      if (err || result.length==0) {
        console.log(result.length);
        if(err)console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          details: result
        });
      
      }
    });
});
//////////////////stu table fetch
app.get('/stutablefetch/:UID', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var UID = req.params.UID;
    var sql = "SELECT * FROM stu_"+UID+";";
    con.query(sql, function (err, result, fields) {
      if (err || result.length==0) {
        if(err)console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          details: result
        });
      
      }
    });
});
//////////////////presence details fetch
app.get('/presencedetailsfetch/:teacher/:section/:UID', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var UID = req.params.UID;
  var teacher = req.params.teacher;
  var section = req.params.section;
    var sql = "SELECT Total FROM "+teacher+" WHERE Section='"+section+"';";
    con.query(sql, function (err, result, fields) {
      if (err || result.length==0) {
        if(err)console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        var total=result[0].Total;
        sql = "SELECT Attendance FROM class_"+teacher+"_"+section+" WHERE UID='"+UID+"';";
    con.query(sql, function (err, result, fields) {
      if (err || result.length==0) {
        if(err)console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.status(200).json({
          total: total,
          present: result[0].Attendance
        });
      }
    });
       
      
      }
    });
});
/////////////////////////Send Mail
app.post('/notify', function (req, res) {
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';
  if (!validate_sub()) {
    res.end(406);
    return;
  }
  else{
  var body = '';
  req.on('data', function (data) {
    body += data;
  });
  req.on('end', () => {
    var Section = JSON.parse(body).section;
    var Username = JSON.parse(body).Username;
    var MSG = JSON.parse(body).value;
    
    var sql=" SELECT * FROM class_" + Username + "_" + Section +" AS FIRST LEFT JOIN students AS SECOND ON FIRST.UID=SECOND.UID;";///////////////////
    con.query(sql, function (err, result) {
      if (err) {
        console.log(err);
        res.sendStatus(406);///SQL Failed
        return;
      }
      else {
        var mails=[];
        result.forEach(i=>{
          mails.push(i.Email);
        });
        if(mails.length==result.length){
        let mailOptions = {
          from: fromMail,
          bcc: mails,
          subject: subject+" - "+Section+", "+Username,
          html: "<p style='color:#bb4444e6;font-size:1.3em;'><i>Broadcast from "+Username+":</i><br> <strong><h4><i style='color: #396363;font-size: 1.4em;'>“"+MSG+"”</i></h4></strong></p>"
          };
          transporter.sendMail(mailOptions, (error, response) => {
            if (error) {
                console.log(error);
            }
            });}
      res.sendStatus(200);
        console.log("Mails Sent for" + Username+"_"+Section);
      }
    });
  });
}
});
/////////////////////////Send Mail, Attendance updates Automated
app.post('/attendancenotify', function (req, res) {
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';
  if (!validate_sub()) {
    res.end(406);
    return;
  }
  else{
  var body = '';
  req.on('data', function (data) {
    body += data;
  });
  req.on('end', () => {
    var Section = JSON.parse(body).section;
    var Username = JSON.parse(body).Username;
    var UIDdata =  JSON.parse(body).UIDdata;
    UIDdata.forEach(i=>{
      var sql=" SELECT Email FROM students WHERE UID = '"+i[0]+"';";
      con.query(sql, function (err, result) {
          result.forEach(output=>{
    let mailOptions = {
      from: fromMail,
      to: output.Email,
      subject: subject+"- Attendance update from "+Section+", "+Username,
      html: "<p style='color:#bb4444e6;font-size:1.3em;'><i>You are short on attendance! Attendance till today: </i><strong>"+ i[1] +"%</strong></p>"
      };
      transporter.sendMail(mailOptions, (error, response) => {
        if (error) {
            console.log(error);
        }
        console.log(response)
        });
  
          });
      
        
      });
    });
    res.sendStatus(200);
    console.log("Attendance alerts sent for" + Username+"_"+Section);
  });
}
});
/////////////////////////Attendance Mark
app.post('/attendancemark', function (req, res) {
  var username = req.headers['uname'];
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';

  if (!validate_sub()) {
    res.end(406);
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  var body = '';
  req.on('data', function (data) {
    body += data;
  });
  req.on('end', () => {
    var uiddata = JSON.parse(body).uids;
    var Section = JSON.parse(body).Section;
    var TBLNAME = username + "_" + Section + "_";
    var values = [];
    var present = 0;
    uiddata.forEach(i => {
      present++;
      var temp = [];
      temp.push(i);
      values.push(temp);
    });
    var today = new Date();
    var date = today.getFullYear() + '_' + (today.getMonth() + 1) + '_' + today.getDate();
    var time = today.getHours() + "_" + today.getMinutes() + "_" + today.getSeconds();
    var dateTime = date + "_" + time;
    var sql = "CREATE TABLE attendance_" + TBLNAME + dateTime + " (UID VARCHAR(255) PRIMARY KEY); ";
    //////////////////
    var totalstudents = 0;
    var countsql = "SELECT COUNT(*) as CNT FROM  class_" + username + "_" + Section + " ;";
    con.query(countsql, function (err, result, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        totalstudents = result[0].CNT;

        var insertsql = "INSERT INTO attendance_logs_" + username + "_" + Section + "  (Name,Present,Absent,Date) VALUES ('attendance_" + TBLNAME + dateTime + "'," + present + "," + (totalstudents - present) + ",'" + date + "') ;";
        con.query(insertsql);
      }
    });



    /////////////////////
    var updatesql = " UPDATE class_" + username + "_" + Section + " SET Attendance=Attendance+1 WHERE UID IN (?);";
    con.query(sql);
    sql = "INSERT INTO attendance_" + TBLNAME + dateTime + " VALUES ?;";
    con.query(sql, [values], function (err, result) {
      if (err) {
        console.log(err);
        res.sendStatus(406);///Attendance logs failed
        return;
      }
      else {
        console.log("Attendance entry for attendance_" + TBLNAME + dateTime);
      }
    });
    con.query(updatesql, [values], function (err, result) {
      if (err) {
        console.log(err);
        res.sendStatus(200);
        return;
      }
      else {
        console.log("Attendance % Updated for attendance_" + Section);
      }
    });
    sql = " UPDATE " + username + " SET Total=Total+1 WHERE Section='" + Section + "';";

    con.query(sql, function (err, result) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        res.sendStatus(200);
        console.log("Total Attendance incremented for class_" + username + "_" + Section);
      }
    });
  });
});
///////////Attendance Del
app.post('/delattendance', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';
  if (false == validate_sub()) {
    res.end(406);
    return;
  } else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var value = JSON.parse(body).value;
      var Section = JSON.parse(body).Section;
      
      var sql = "DELETE FROM attendance_logs_" + UID + "_" + Section + " WHERE Name='" + value + "';";
      con.query(sql, function (err, result) {
        if (err) {
          res.sendStatus(406);
          console.log("Attendance Log Removal failed");
          return;
        }
        else {
          ////////attendance log success
          sql = "SELECT * FROM " + value + ";";
          con.query(sql, function (err, result) {
            if (err) {
              res.sendStatus(406);
              ///backtracking required, skipping for now
              console.log("Attendance List Retrival failed");
              return;
            }
            else {
              var dropsql="DROP TABLE "+value+";";
              con.query(dropsql, function(err){
                if(err){
                  console.log(err);
                  console.log("Error in dropping attendance table");
                  return;
                }
              });
              //retrival success
              var values = [];
              result.forEach(i => {
                var temp = [];
                temp.push(i.UID);
                values.push(temp);
              });
              sql = "UPDATE class_" + UID + "_" + Section + " SET Attendance=Attendance-1 WHERE UID IN (?);";
              con.query(sql, [values], function (err, result) {
                if (err) {
                  res.sendStatus(406);
                  ///backtracking required, skipping for now
                  console.log("Class List update failed");
                  return;
                }
                else {
                  //All success
                  sql = "UPDATE " + UID + " SET Total=Total-1 WHERE Section='" + Section + "';";
                  con.query(sql, function (err) {
                    if (err) {
                      res.sendStatus(406);
                      console.log(err);
                      console.log("UID table update failed");
                      return;
                    }
                    else {
                      console.log("Allendance List deletion success");
                      res.sendStatus(200);
                    }
                  });

                }
              });
            }
          });
        }
      });

    });
  }
});
/////////////////////////edit class list
app.post('/updateclasslist', function (req, res) {

  host = req.headers['resid'];
  userType = req.headers['usertype'];
  var username = req.headers['uname'];
  type_name = 'faculty';

  if (!validate_sub()) {
    res.end(406);
    return;
  }
  else {
    res.setHeader('Content-Type', 'application/json');
    var body = '';
    req.on('data', function (data) {
      body += data;
    });
    req.on('end', () => {
      var tba = JSON.parse(body).tba;
      var tbr = JSON.parse(body).tbr;
      var Section = JSON.parse(body).Section;
      var tbavalues = [];
      tba.forEach(i => {
        var temp = [];
        var fetchsql = "SELECT Name FROM students WHERE UID = '" + i + "';";


        con.query(fetchsql, function (err, result) {
          if (err) {
            console.log("FetchSQL Error");
            console.log(err);
            res.sendStatus(406);
            return;
          }
          else {
            temp.push(i);
            temp.push(0);
            temp.push(result[0].Name);
            var temp1 = [];
            temp1.push(temp);
            var insertsql = " INSERT INTO class_" + username + "_" + Section + " (UID, Attendance, Name) VALUES ?;";
            con.query(insertsql, [temp1], function (err, result) {
              if (err) {
                console.log(err);
                res.sendStatus(406);
                return;
              }
              else {
                console.log("Student added to " + Section);
                insertsql = " INSERT INTO stu_" + i + " (Teacher, Section) VALUES ('" + username + "','" + Section + "');";
                con.query(insertsql, function (err) {
                  if (err) {
                    console.log(err);
                    res.sendStatus(406);
                    return;
                  }
                });
              }
            });
          }
        });

      });
      var tbrvalues = [];
      tbr.forEach(i => {
        var temp = [];
        var delsql = " DELETE FROM stu_" + i + " WHERE Teacher='" + username + "' AND Section='" + Section + "';";
        con.query(delsql, function (err) {
          if (err) {
            console.log(err);
            res.sendStatus(406);
            return;
          }
        });
        temp.push(i);
        tbrvalues.push(temp);
      });

      if (tbrvalues.length > 0) {
        var delsql = " DELETE FROM class_" + username + "_" + Section + " WHERE UID IN (?);";
        con.query(delsql, [tbrvalues], function (err, result) {
          if (err) {
            console.log(err);
            res.sendStatus(406);
            return;
          }
          else {
            console.log("Students removed from " + Section);
          }
        });
      }

      res.sendStatus(200);
    });
  }
});
//////////////////////////////////Add class
app.post('/createclass', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';

  if (!validate_sub()) {
    res.end(406);
    return;
  }
  else {
    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var section = JSON.parse(body).Section;
      var sql = "INSERT INTO " + UID + " VALUES ('" + section + "', 0);";
      con.query(sql, function (err, result) {
        if (err) {
          console.log(err);
          res.sendStatus(406);
          return;
        }
        else {
          console.log("Class Logged");
          ///
          sql = "CREATE TABLE class_" + UID + "_" + section + " (UID VARCHAR(255) PRIMARY KEY, Attendance DOUBLE(5,2), Name VARCHAR(255));";
          con.query(sql, function (err, result) {
            if (err) {
              console.log(err);
              res.sendStatus(406);
              return;
            }
            else {
              sql = "CREATE TABLE attendance_logs_" + UID + "_" + section + " (Name VARCHAR(255) PRIMARY KEY, Present INT, Absent INT, Date VARCHAR(225), TimeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);";
              con.query(sql, function (err, result) {
                if (err) {
                  console.log(err);
                  res.sendStatus(406);
                  return;
                }
                else {

                  res.sendStatus(200);
                  console.log("Class Table Created");

                }
              });
            }
          });
        }
      });
    });
  }
});
//////////////////////////////////Del class
app.post('/delclass', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';

  if (!validate_sub()) {
    res.end(406);
    return;
  } else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var ClassName = JSON.parse(body).Class;
      var sql = "DELETE FROM " + UID + " WHERE Section='" + ClassName + "';";
      con.query(sql, function (err, result) {
        if (err) {
          console.log(err);
          console.log("Error in deleting entry from UID table");
          res.sendStatus(406);
          return;
        }
        else {
          /////////////////update stu_ tables here
          sql = "SELECT UID FROM class_" + UID + "_" + ClassName + ";";
          con.query(sql, function (err, result) {
            if (err) {
              console.log(err);
              res.sendStatus(406);
              return;
            }
            else {
              ////traverse the result and update stu_ tables accordingly
              result.forEach(i => {
                var stu_updatesql = "DELETE FROM stu_" + i.UID + " WHERE Section='" + ClassName + "' AND Teacher='" + UID + "';";
                con.query(stu_updatesql, function (err, result) {
                  if (err) {
                    console.log(err);
                    console.log("Error while deleting values from stu_ tables");
                    res.sendStatus(406);
                    return;
                  }
                });
              });
              ///delete class_ table
              sql = "DROP TABLE class_" + UID + "_" + ClassName + ";";
              con.query(sql, function (err, result) {
                if (err) {
                  console.log(err);
                  res.sendStatus(406);
                  return;
                }
                else {
                  ////delete attendance here
                  sql = "SELECT Name FROM attendance_logs_" + UID + "_" + ClassName + ";";
                  con.query(sql, function (err, result) {
                    if (err) {
                      console.log(err);
                      console.log("attendance_logs fetch failed");
                      res.sendStatus(406);
                      return;
                    }
                    else {
                      /////traverse the result and delete attendance tables
                      result.forEach(i => {
                        var ATTENDANCEDROP = "DROP TABLE " + i.Name + ";";
                        con.query(ATTENDANCEDROP, function (err, result) {
                          if (err) {
                            console.log(err);
                            console.log("Error while deleting attendance tables");
                            res.sendStatus(406);
                            return;
                          }
                        });
                      });
                      sql = "DROP TABLE attendance_logs_" + UID + "_" + ClassName + ";";
                      con.query(sql, function (err, result) {
                        if (err) {
                          console.log(err);
                          res.sendStatus(406);
                          console.log("Error dropping attendance_logs");
                          return;
                        }
                        else {
                          res.sendStatus(200);
                          console.log("Class Delete Success");
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  }
});
//////////////////////////////////Add Students
app.post('/addstudent', function (req, res) {
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'ADMIN';
  if (!validate_sub()) {
    res.end(406);
    return;
  } else {
    res.setHeader('Content-Type', 'application/json');
    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var name = JSON.parse(body).name;
      var UID = JSON.parse(body).UID;
      var batch = JSON.parse(body).batch;
      var mobile = JSON.parse(body).mobile;
      var email = JSON.parse(body).email;

      var sql = "INSERT INTO students (Name, UID, Mobile, Batch, Password, Email) VALUES ?";
      var values = [
        [name, UID, mobile, batch, crypto.createHash('md5').update(UID).digest('hex'), email]
      ];
      con.query(sql, [values], function (err, result) {
        if (err) {
          res.sendStatus(406);
          return;
        }
        else {
          sql = "CREATE TABLE stu_" + UID + " (Teacher VARCHAR(255), Section VARCHAR(255));";
          con.query(sql);
          res.sendStatus(200);
          console.log("Values Added");
        }
      });

    });
  }
});
///////////Student Del
app.post('/studentdel', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'ADMIN';
  if (false == validate_sub()) {
    res.end(406);
    return;
  }
  else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var batch = JSON.parse(body).batch;
      if (UID == 'ADMIN') { res.sendStatus(406); return; }
      var sql = "DELETE FROM students WHERE UID='" + UID + "' AND Batch='" + batch + "';";
      con.query(sql, function (err, result) {
        if (err || result.affectedRows == 0) {
          res.sendStatus(406);
          console.log(err);
          console.log("Student Removal failed from student table or Student doesn't exist");
          return;
        }
        else {
          sql = "SELECT * FROM stu_" + UID + ";";
          con.query(sql, function (err, result) {
            if (err) {
              res.sendStatus(406);
              console.log(err);
              console.log("Stu_ table fetch failed");
              return;
            }
            else {
              ///traversing all classes
              result.forEach(i => {
                sql = "DELETE FROM class_" + i.Teacher + "_" + i.Section + " WHERE UID='" + UID + "';";
                con.query(sql, function (err, result) {
                  if (err) {
                    res.sendStatus(406);
                    console.log(err);
                    console.log("Error while deleting values from class_ tables");
                    return;
                  }
                });
              });
              var studel = "DROP TABLE stu_" + UID + ";";
              con.query(studel, function (err, result) {
                if (err) {
                  res.sendStatus(406);
                  console.log(err);
                  console.log("Error while deleting stu_ table");
                  return;
                }
                else {
                  res.sendStatus(200);
                  console.log("STUDENT delete success");
                }
              });
            }
          });
        }
      });

    });
  }
});
//////////////////////////////////Add faculty
app.post('/addfaculty', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'ADMIN';

  if (!validate_sub()) {
    res.end(406);
    return;
  } else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var name = JSON.parse(body).name;
      var UID = JSON.parse(body).UID;
      var email = JSON.parse(body).email;
      var mobile = JSON.parse(body).mobile;
      var sql = "INSERT INTO faculty (Name, UID, Mobile, Email, Password) VALUES ?";
      var values = [
        [name, UID, mobile, email, crypto.createHash('md5').update(UID).digest('hex')]
      ];
      con.query(sql, [values], function (err, result) {
        if (err) {
          console.log(err);
          res.sendStatus(406);
          return;
        }
        else {
          console.log("Values Added");
          sql = "CREATE TABLE " + UID + " (Section VARCHAR(255) PRIMARY KEY, Total INT);";
          con.query(sql, function (err, result) {
            if (err) {
              console.log(err);
              res.sendStatus(406);
              return;
            }
            else {
              res.sendStatus(200);
              console.log("Personal Table Created for " + UID);
            }
          });
        }
      });

    });
  }
});
///////////Faculty Del
app.post('/facultydel', function (req, res) {
  ///DELETE FROM Faculty Table->UID TABLE->Traverse through all classes->->update stu_ tables for all students->attendance_logs->delete attendances->delete attendance logs->delete class_ tables->delete UID table
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'ADMIN';
  if (false == validate_sub()) {
    res.end(406);
    return;
  }
  else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var email = JSON.parse(body).mail;
      if (UID == 'ADMIN') { res.sendStatus(406); return; }
      var sql = "DELETE FROM faculty WHERE UID='" + UID + "' AND Email='" + email + "';";
      con.query(sql, function (err, result) {

        if (err || result.affectedRows == 0) {
          res.sendStatus(406);
          console.log("Faculty Removal failed or Faculty doesn't exist");
          return;
        }
        else {
          /////traverse the UID table
          var no_of_classes = 1;
          sql = "SELECT * FROM " + UID + " ;";
          con.query(sql, function (err, result) {
            no_of_classes = result.length;
            console.log("No of classes:" + no_of_classes);
            if (err) {
              console.log("UID table fetch error");
              res.sendStatus(406);
              return;
            }
            else {
              var UIDtableDROP = "DROP TABLE " + UID + ";";
              con.query(UIDtableDROP, function (err) {
                if (err) {
                  console.log(err);
                  console.log("UID table drop error");
                  res.sendStatus(406);
                  return;
                }

              });
              result.forEach(ClassName => {
                //////////////////////////////////////////////////traversing classes
                sql = "SELECT UID FROM class_" + UID + "_" + ClassName.Section + ";";
                con.query(sql, function (err, result) {
                  if (err) {
                    console.log(err);
                    console.log("class_ table fetch error");
                    res.sendStatus(406);
                    return;
                  }
                  else {

                    ////traverse the result and update stu_ tables accordingly
                    result.forEach(i => {
                      var stu_updatesql = "DELETE FROM stu_" + i.UID + " WHERE Section='" + ClassName.Section + "' AND Teacher='" + UID + "';";
                      con.query(stu_updatesql, function (err, result) {
                        if (err) {
                          console.log(err);
                          console.log("Error while deleting values from stu_ tables");
                          res.sendStatus(406);
                          return;
                        }
                      });
                    });
                    ///delete class_ table
                    sql = "DROP TABLE class_" + UID + "_" + ClassName.Section + ";";
                    con.query(sql, function (err, result) {
                      if (err) {
                        console.log(err);
                        res.sendStatus(406);
                        return;
                      }
                      else {

                        ////delete attendance here
                        sql = "SELECT Name FROM attendance_logs_" + UID + "_" + ClassName.Section + ";";
                        con.query(sql, function (err, result) {
                          if (err) {
                            console.log(err);
                            console.log("attendance_logs fetch failed");
                            res.sendStatus(406);
                            return;
                          }
                          else {
                            /////traverse the result and delete attendance tables
                            result.forEach(i => {
                              var ATTENDANCEDROP = "DROP TABLE " + i.Name + ";";
                              con.query(ATTENDANCEDROP, function (err, result) {
                                if (err) {
                                  console.log(err);
                                  console.log("Error while deleting attendance tables");
                                  res.sendStatus(406);
                                  return;
                                }
                              });
                            });
                            sql = "DROP TABLE attendance_logs_" + UID + "_" + ClassName.Section + ";";
                            con.query(sql, function (err, result) {
                              if (err) {
                                console.log(err);
                                res.sendStatus(406);
                                console.log("Error dropping attendance_logs");
                                return;
                              }
                              else {
                                console.log("Class Delete Success");
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });

                no_of_classes--;

                ///////////////////////////////////////////////////
              });

            }
            if (no_of_classes == 0) {
              console.log("res len 0 -- end");
              res.sendStatus(200);
              return;
            }
          });
        }
      });

    });
  }
});
///////////Key Update
app.post('/keyupdate', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = userType;
  if (false == validate_sub()) {
    res.end(406);
    return;
  }

  var body1 = '';
  req.on('data', function (data) {
    body1 += data;
  });

  req.on('end', () => {
    var body = Buffer.from(body1, 'base64').toString('utf8');
    var UID = JSON.parse(body).uid;
    var oldpass = JSON.parse(body).oldpass;
    var newpass = JSON.parse(body).newpass;

    var sql = "UPDATE faculty SET Password= '" + newpass + "' WHERE UID='" + UID + "' AND Password='" + oldpass + "';";

    con.query(sql, function (err, result) {
      if (err || result.affectedRows == 0) {
        res.sendStatus(406);
        console.log(err);
        console.log("Key Update Failed");
        return;
      }
      else {
        res.sendStatus(200);
        console.log("Key Updated for " + UID);
      }
    });

  });
});
//////////////////////////////////update faculty
app.post('/identityupdate', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  host = req.headers['resid'];
  userType = req.headers['usertype'];
  type_name = 'faculty';

  if (!validate_sub()) {
    res.end(406);
    return;
  } else {

    var body = '';
    req.on('data', function (data) {
      body += data;
    });

    req.on('end', () => {
      var UID = JSON.parse(body).UID;
      var email = JSON.parse(body).email;
      var mobile = JSON.parse(body).mobile;
      var sql = "UPDATE faculty SET Mobile='" + mobile + "', Email='" + email + "' WHERE UID='" + UID + "';";
      con.query(sql, function (err, result) {
        if (err) {
          console.log(err);
          res.sendStatus(406);
          return;
        }
        else {
          if (result.affectedRows == 0) {
            res.sendStatus(406);
            return;
          } else {
            res.sendStatus(200);
            console.log("Values Updated");
          }
        }
      });

    });
  }
});
//////////////////////////////////Admin Login
app.post('/login', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  console.log(req.sessionID);
  var body1 = '';
  req.on('data', function (data) {
    body1 += data;
  });

  req.on('end', () => {
    var body = Buffer.from(body1, 'base64').toString('utf8');
    var id = JSON.parse(body).id;
    var pass = JSON.parse(body).pass;
    var type = JSON.parse(body).type;
    //////FOR REF///////crypto.createHash('md5').update(pass).digest('hex')
    var sql;
    if (id == "ADMIN")
      sql = "SELECT COUNT(*) as CNT FROM faculty WHERE UID = '" + id + "' AND Password='" + pass + "';";
    else
      sql = "SELECT COUNT(*) as CNT FROM " + type + " WHERE UID = '" + id + "' AND Password='" + pass + "';";
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(406);
        return;
      }
      else {
        if (result[0].CNT == 1) {
          console.log(id + " Logged In");
          //res.sendStatus(200);
          req.session.user = {
            UID: id,
            type: type
          }
          req.session.save(err => {
            if (err) {
              console.log(err);
              res.sendStatus(407);
              return;
            } else {
              console.log(req.session);
              res.send(req.sessionID);
            }
          });
        } else {
          console.log(id + " Wrong Cred");
          res.sendStatus(407);
        }
      }
    });

  });
});//////////////LOGOUT
app.get('/logout', (req, res, next) => {
  var host = req.headers['resid'];
  console.log(host);
  var status = 1;
  MongoClient.connect(url, function (err, db) {
    if (err) {
      status = 0;
      console.log(err);
    } else {
      var dbo = db.db("sessionsdb");
      dbo.collection("sessions").findOne({ _id: host }, function (err, result) {
        if (err) { status = 0; throw err; }
        console.log(result);
        if (result == null) {
          status = 0;
          res.sendStatus(406).end("Already logged out!");
        } else {
          req.sessionID = host;
          req.session.destroy(err => {
            if (err) {
              status = 0;
              console.log(err);
            } else {
              var dbo1 = db.db("sessionsdb");
              dbo1.collection("sessions").deleteOne({ _id: host });
              console.log(req.sessionID + " Logged out!");
              res.end(req.sessionID + " Logged out!");
            }
          });
        }
        //db.close();
      });
    }
  }
  );


});

app.listen(process.env.PORT || 8080);