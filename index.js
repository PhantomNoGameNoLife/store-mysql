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
        })
    })
})

app.post("/suppliers", (req, res) => {
    const { name, contact } = req.body
    connection.execute(`insert into suppliers (sup_name, sup_contactnum) values (?, ?)`, [name, contact],
        (err, result) => {
            if (err) return res.status(500).json(err)
            if (result.affectedRows > 0) return res.status(201).json({ message: "Supplier Added Successfully" })
            return res.status(400).json({ message: "fail to add supplier" })
        }
    )
})

app.post("/products", (req, res) => {
    const { name, price, quantity, supplierId } = req.body
    connection.execute(`insert into products (p_name, p_price, p_stkqty, supplier_id) values (?, ?, ?, ?)`, [name, price, quantity, supplierId],
        (err, result) => {
            if (err) {
                if (err.errno === 1452) return res.status(500).json({ message: "supplier_id doesn't exist" })
                return res.status(400).json(err)
            }
            if (result.affectedRows > 0) return res.status(201).json({ message: "Product Added Successfully" })
            return res.status(400).json({ message: "fail to add product" })
        }
    )
})

app.post("/sales", (req, res) => {
    const { productId, quantity, date } = req.body
    connection.execute(`insert into sales (product_id, sal_qtysold, sal_date) values (?, ?, ?)`,
        [productId, quantity, date],
        (err, result) => {
            if (err) {
                if (err.errno === 1452) return res.status(500).json({ message: "product_id doesn't exist" })
                return res.status(400).json(err)
            }
            if (result.affectedRows > 0) return res.status(201).json({ message: "Sale Added Successfully" })
            return res.status(400).json({ message: "fail to add sale" })
        }
    )
})

app.patch("/products/:id", (req, res) => {
    const { price } = req.body
    connection.execute(`update products set p_price=? where p_id=?`, [price, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err)
            if (result.affectedRows > 0) return res.status(200).json({ message: "Price updated" })
            return res.status(400).json({ message: "fail to update price or product_id doesn't exist" })
        }
    )
})

app.delete("/products/:id", (req, res) => {
    connection.execute(`delete from products where p_id=?`, [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err)
            if (result.affectedRows > 0) return res.status(200).json({ message: "Product deleted" })
            return res.status(400).json({ message: "fail to delete product or product_id doesn't exist" })
        }
    )
})

app.get("/sales/total-sales", (req, res) => {
    connection.execute(`
        select p.p_name, sum(s.sal_qtysold) as total_quantity_sold
        from products p
        join sales s on p.p_id = s.product_id
        group by p.p_id`, (err, result) => {
        if (err) return res.status(500).json(err)
        if (result.length === 0) return res.status(404).json({ message: "sale doesn't exist" })
        return res.status(200).json(result)
    })
})

app.get("/products/highest-stock", (req, res) => {
    connection.execute(`select * from products order by p_stkqty desc limit 1`,
        (err, result) => {
            if (err) return res.status(500).json(err)
            if (result.length === 0) return res.status(404).json({ message: "no products" })
            return res.status(200).json(result[0])
        })
})

app.get("/suppliers/search/:name", (req, res) => {
    connection.execute(`select * from suppliers where sup_name like ?`, [`${req.params.name}%`],
        (err, result) => {
            if (err) return res.status(500).json(err)
            if (result.length === 0) return res.status(404).json({ message: "no products" })
            return res.status(200).json(result)
        })
})

app.get("/products/not-sold", (req, res) => {
    connection.execute(`
        select p.*
        from products p
        left join sales s on p.p_id = s.product_id
        where s.product_id is null`, (err, result) => {
        if (err) return res.status(500).json(err)
        if (result.length === 0) return res.status(404).json({ message: "no products" })
        return res.status(200).json(result)
    })
})

app.get("/sales/details", (req, res) => {
    connection.execute(`
        select p.p_name,s.sal_date 
        from products as p join sales as s
        on p.p_id=s.product_id`, (err, result) => {
        if (err) return res.status(500).json(err)
        if (result.length === 0) return res.status(404).json({ message: "no sales details" })
        return res.status(200).json(result)
    })
})

app.post("/admin", (req, res) => {
    const { name, password } = req.body
    connection.execute(`create user if not exists \`${name}\`@'localhost' identified by '${password}'`, (err, result) => {
        if (err) return res.status(500).json(err)
        console.log(result)
        return res.status(201).json({ message: "Admin Add Successfully" })
    })
})

app.post("/admin/grant", (req, res) => {
    const { user, db } = req.body
    connection.query(`grant select, insert, update on \`${db}\`.* to '${user}'@'localhost'`, (err, result) => {
        if (err) return res.status(500).json(err)
        console.log(result)
        return res.status(200).json({ message: `SELECT, INSERT, UPDATE granted to ${user} on database ${db}` })
    })
})

app.post("/admin/revoke-update", (req, res) => {
    const { user, db } = req.body
    connection.query(`revoke update on \`${db}\`.* from '${user}'@'localhost'`, (err, result) => {
        if (err) return res.status(500).json(err)
        return res.status(200).json({ message: `UPDATE permission revoked from ${user} on database ${db}` })
    })
})

app.post("/admin/grant-delete", (req, res) => {
    const { user, db, table } = req.body
    connection.query(`grant delete on \`${db}\`.\`${table}\` to '${user}'@'localhost'`, (err, result) => {
        if (err) return res.status(500).json(err)
        return res.status(200).json({ message: `DELETE granted on ${db}.${table} table to ${user}` })
    })
})

app.listen(port, () => {
    console.log(`app is running on port ${port}`)
})