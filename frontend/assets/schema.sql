-- Database creation
CREATE DATABASE IF NOT EXISTS scada_db;
USE scada_db;

-- Drilling RTDMM table
CREATE TABLE IF NOT EXISTS drilling_rtdmm (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE,
    rig_name VARCHAR(100),
    location VARCHAR(100),
    availability VARCHAR(50),
    remark TEXT,
    install_date DATE,
    deinstall_date DATE
);

-- Production SCADA table
CREATE TABLE IF NOT EXISTS production_scada (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production VARCHAR(100),
    location VARCHAR(100),
    availability VARCHAR(50),
    remark TEXT
);
