import { fork } from "child_process";
import express from "express";
import path from "path";
import { Application } from "./app";
import { pool } from "./data/pool";

const clearDataJobs = fork(path.join(__dirname, "jobs", "clear-data"));

const app = new Application(express(), pool);
