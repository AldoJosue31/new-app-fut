import React from "react";
import { HomeTemplate } from "../components/template/HomeTemplate";

// Recibimos state y setState desde el Router
export function Home({ state, setState }) {
    return <HomeTemplate state={state} setState={setState} />;
}