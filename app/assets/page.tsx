"use client";

import { useEffect, useState } from "react";

export default function Assets() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("assets") || "[]");
    setAssets(data);
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Assets List</h1>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Tag</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {assets.map((a: any) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.tag}</td>
              <td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}