
-- Database Schema for Automated SCADA DPR System
-- ONGC Assam Asset


-- Create Database
CREATE DATABASE IF NOT EXISTS scada_dpr;
USE scada_dpr;


-- Table: dpr_master
-- Stores unique DPR dates

CREATE TABLE IF NOT EXISTS dpr_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dpr_date DATE NOT NULL UNIQUE
);


-- Table: drilling_rtdmm
-- Stores Drilling RTDMM DPR data

CREATE TABLE IF NOT EXISTS drilling_rtdmm (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dpr_id INT NOT NULL,
    rig_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    availability VARCHAR(50),
    remark VARCHAR(500),
    install_date DATE,
    deinstall_date DATE,
    FOREIGN KEY (dpr_id) REFERENCES dpr_master(id)
        ON DELETE CASCADE
);


-- Table: production_scada
-- Stores Production SCADA DPR data
CREATE TABLE IF NOT EXISTS production_scada (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dpr_id INT NOT NULL,
    installation VARCHAR(100) NOT NULL,
    location TEXT,
    availability VARCHAR(50),
    remark VARCHAR(500),
    FOREIGN KEY (dpr_id) REFERENCES dpr_master(id)
        ON DELETE CASCADE
);


-- Table: major_activities
-- Stores automatically generated activity logs

CREATE TABLE IF NOT EXISTS major_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dpr_id INT NOT NULL,
    section VARCHAR(50),
    references_name VARCHAR(100),
    field_changed VARCHAR(100),
    new_value VARCHAR(500),
    activity_date DATE,
    FOREIGN KEY (dpr_id) REFERENCES dpr_master(id)
        ON DELETE CASCADE
);
