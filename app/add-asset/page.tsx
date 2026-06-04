"use client";

import { useState, useEffect } from "react";

export default function AddAsset() {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const existing = JSON.parse(localStorage.getItem("assets") || "[]");

    const newAsset = {
      id: Date.now(),
      name,
      tag,
      status
    };

    existing.push(newAsset);
    localStorage.setItem("assets", JSON.stringify(existing));

    alert("Asset Saved Successfully ✅");

    setName("");
    setTag("");
    setStatus("");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Asset</h1>

      <form onSubmit={handleSubmit}>
        <input placeholder="Asset Name" value={name}
          onChange={(e) => setName(e.target.value)} />

        <br /><br />

        <input placeholder="Asset Tag" value={tag}
          onChange={(e) => setTag(e.target.value)} />

        <br /><br />

        <input placeholder="Status" value={status}
          onChange={(e) => setStatus(e.target.value)} />

        <br /><br />

        <button type="submit">Save Asset</button>
      </form>
    </div>
  );
}