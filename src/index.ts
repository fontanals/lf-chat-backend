import express from "express";
import { Application } from "./app";
import { pool } from "./data/pool";

const app = new Application(express(), pool);
