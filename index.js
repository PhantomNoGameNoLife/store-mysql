const express = require('express')
const mysql = require("mysql2")
const app = express()
const port = 3000

app.use(express.json())

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: ""
})

connection.connect((err) => {
    if (err) return console.log(err)
    console.log("SQL Connected")
    // create database
    connection.execute(`create database if not exists store`, (err) => {
        if (err) return console.log(err)
        // connect to database
        connection.changeUser({ database: "store" }, (err) => {
            if (err) return console.log(err)
            console.log("Database connected");

            //create suppliers table
            connection.execute(`create table if not exists suppliers (
                sup_id int(11) primary key auto_increment,
                sup_name varchar(200) not null,
                sup_contactnum varchar(200) not null
            )`, (err) => {
                if (err) return console.log(err)
                console.log("suppliers table created")
            })

            //create products table
            connection.execute(`create table if not exists products (
                p_id int(11) primary key auto_increment,
                p_name varchar(200) not null,
                p_price decimal(11,2) not null CHECK (p_price >= 0),
                p_stkqty int(11) not null,
                supplier_id int(11) not null,
                constraint fk_tbProducts_tbSuppliers foreign key (supplier_id) 
                References suppliers(sup_id) on delete restrict on update restrict
            )`, (err) => {
                if (err) return console.log(err)
                console.log("products table created")
            })

            //create sales table
            connection.execute(`create table if not exists sales (
                sal_id int(11) primary key auto_increment,
                sal_qtysold int(11) not null,
                sal_date date default current_date not null,
                product_id int(11) not null,
                constraint fk_tbSales_tbProducts foreign key (product_id) 
                References products(p_id) on delete restrict on update restrict
            )`, (err) => {
                if (err) return console.log(err)
                console.log("sales table created")
            })

            //add Category column
            connection.execute(`alter table products add column if not exists p_category varchar(200) not null`, (err) => {
                if (err) return console.log(err)
                console.log("Category column added")
            })

            //remove Category column
            connection.execute(`alter table products drop column p_category`, (err) => {
                if (err) return console.log(err)
                console.log("Category column removed")
            })

            //change contactNumber to varchar(15)
            connection.execute(`alter table suppliers modify column sup_contactnum varchar(15) not null`, (err) => {
                if (err) return console.log(err)
                console.log("contactNumber Changed")
            })

            //add NOT NULL to ProductName.
            connection.execute(`alter table products modify column p_name varchar(200) not null`, (err) => {
                if (err) return console.log(err)
                console.log("ProductName is NOT NULL")
            })

            //inserts
            connection.execute(`insert into suppliers(sup_name,sup_contactnum) values('FreshFoods','01001234567')`, (err) => {
                if (err) return console.log(err)
                console.log("FreshFoods inserted")
            })
            connection.execute(`insert into products(p_name,p_price,p_stkqty,supplier_id) 
                values('milk','15.00','50','1'),('bread','10.00','30','1'),('eggs','20.00','40','1')`, (err) => {
                if (err) return console.log(err)
                console.log("products inserted")
            })
            connection.execute(`insert into sales(product_id,sal_qtysold,sal_date) values('1','2','2025-05-20')`, (err) => {
                if (err) return console.log(err)
                console.log("sales inserted")
            })

            //update bread price
            connection.execute(`update products set p_price='25.00' where p_name='bread'`, (err) => {
                if (err) return console.log(err)
                console.log("bread price updated")
            })

            //delete product eggs
            connection.execute(`delete from products where p_name='eggs'`, (err) => {
                if (err) return console.log(err)
                console.log("product eggs deleted")
            })

            //total quantity sold for each product
            connection.execute(`select p.p_name,sum(s.sal_qtysold) as total_quantity_sold
                from products as p join sales as s 
                on p.p_id=s.product_id`, (err, result) => {
                if (err) return console.log(err)
                console.log(result[0])
            })

            //get product with the highest stock
            connection.execute(`select * from products order by p_stkqty desc limit 1`, (err, result) => {
                if (err) return console.log(err)
                console.log(result[0])
            })

            //Find suppliers with names starting with 'F'
            connection.execute(`SELECT * FROM suppliers WHERE sup_name LIKE 'F%'`, (err, result) => {
                if (err) return console.log(err)
                console.log(result)
            })

            //Show all products that have never been sold
            connection.execute(`
                SELECT * 
                FROM products as p LEFT JOIN sales as s
                on p.p_id=s.product_id
                WHERE s.product_id IS NULL`, (err, result) => {
                if (err) return console.log(err)
                console.log(result)
            })

            //Get all sales along with product name and sale date
            connection.execute(`
                SELECT p.p_name,s.sal_date 
                FROM products as p JOIN sales as s
                on p.p_id=s.product_id`, (err, result) => {
                if (err) return console.log(err)
                console.log(result)
            })

            //Create a user “store_manager” and give them SELECT, INSERT, and UPDATE permissions on all tables
            connection.execute(`create user if not exists 
                'store_manager'@'localhost' identified by 'admin'`, (err) => {
                if (err) return console.log(err)
                console.log("store_manager user created")
            })
            connection.execute(`grant select, insert, update on store.* to 'store_manager'@'localhost'`, (err) => {
                if (err) return console.log(err)
                console.log("select, insert, update granted to store_manager")
            })

            //Revoke UPDATE permission from “store_manager”
            connection.execute(`revoke update on store.* from 'store_manager'@'localhost'`, (err) => {
                if (err) return console.log(err)
                console.log("update permission revoked from store_manager")
            })

            //Grant DELETE permission to “store_manager” only on the Sales table
            connection.execute(`grant delete on store.sales to 'store_manager'@'localhost'`, (err) => {
                if (err) return console.log(err)
                console.log("DELETE permission granted on sales table only")
            })
        })
    })
})

app.listen(port, () => {
    console.log(`app is running on port ${port}`)
})