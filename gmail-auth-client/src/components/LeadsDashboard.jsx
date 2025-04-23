import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { Line, Bar } from "react-chartjs-2";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from "chart.js";
import LeadsDatabase from "./LeadsDatabase";
import Navbar from "./Navbar";
import "./LeadsDashboard.css";

// Chart.js module registration
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

const Button = ({ children, onClick }) => (
  <button className="btn outline" onClick={onClick}>
    {children}
  </button>
);

const Card = ({ children }) => <div className="card">{children}</div>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;

// Define Table components
const Table = ({ children }) => <table className="table">{children}</table>;
const TableHeader = ({ children }) => <thead>{children}</thead>;
const TableBody = ({ children }) => <tbody>{children}</tbody>;
const TableRow = ({ children }) => <tr>{children}</tr>;
const TableHead = ({ children }) => <th>{children}</th>;
const TableCell = ({ children }) => <td>{children}</td>;

export default function LeadsDashboard() {
  const [showDatabase, setShowDatabase] = useState(false);
  const [leads, setLeads] = useState([]);
  const [newLeads, setNewLeads] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8083/leads") // Replace with your API URL
      .then((res) => {
        const fetchedLeads = res.data.leads;

        // Sort leads by date in descending order to get the latest ones
        const sortedLeads = [...fetchedLeads].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setLeads(sortedLeads);
        setNewLeads(sortedLeads); // Get the top 3 new leads
      })
      .catch((err) => {
        console.error("Failed to fetch leads:", err);
      });
  }, []);  // Empty dependency array ensures this runs only on mount

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === "Converted").length;
  const conversionRate = totalLeads === 0 ? "0%" : `${Math.round((convertedLeads / totalLeads) * 100)}%`;

  const metrics = [
    { title: "Total Leads", value: totalLeads },
    { title: "Leads Converted", value: convertedLeads },
    { title: "Conversion Rate", value: conversionRate },
    { title: "New Leads", value: newLeads.length },
  ];

  // 📈 Leads by Month
  const monthlyMap = {};
  leads.forEach(({ date, status }) => {
    const d = new Date(date);
    const month = d.toLocaleString("default", { month: "short" });
    if (!monthlyMap[month]) monthlyMap[month] = { tl: 0, cc: 0 };
    monthlyMap[month].tl++;
    if (status === "Converted") monthlyMap[month].cc++;
  });
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = allMonths.map((month) => ({
    month,
    tl: monthlyMap[month]?.tl || 0,
    cc: monthlyMap[month]?.cc || 0
  }));

  const dataForTotalLeads = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: "Total Leads",
        data: monthlyData.map(d => d.tl),
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
        fill: false
      },
      {
        label: "Leads Converted",
        data: monthlyData.map(d => d.cc),
        borderColor: "rgba(153,102,255,1)",
        tension: 0.1,
        fill: false
      }
    ]
  };

  // 💰 Leads by Budget
  const budgetMap = {};
  leads.forEach(({ budget }) => {
    if (!budget) return;
    budgetMap[budget] = (budgetMap[budget] || 0) + 1;
  });
  const budgetData = Object.keys(budgetMap).map(b => ({
    budget: b,
    value: budgetMap[b]
  }));

  const dataForLeadsByBudget = {
    labels: budgetData.map(d => d.budget),
    datasets: [
      {
        label: "Leads by Budget",
        data: budgetData.map(d => d.value),
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1
      }
    ]
  };

  // 📡 Leads Source
  const sourceMap = {};
  leads.forEach(({ source }) => {
    if (!source) return;
    sourceMap[source] = (sourceMap[source] || 0) + 1;
  });
  const sourceLabels = Object.keys(sourceMap);
  const sourceSeries = sourceLabels.map(s => sourceMap[s]);

  const sourceChartOptions = {
    chart: { type: "radialBar" },
    plotOptions: {
      radialBar: {
        hollow: { size: "30%" }
      }
    },
    labels: sourceLabels,
    colors: ["#FF6384", "#36A2EB", "#FFCE56", "#8BC34A", "#9C27B0"]
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="header">
        {!showDatabase && <h1>Leads Dashboard</h1>}
        <div className="buttons">
          {!showDatabase && (
            <Button onClick={() => setShowDatabase(true)}>
              View Database
            </Button>
          )}
        </div>
      </div>

      {showDatabase ? (
        <LeadsDatabase />
      ) : (
        <>
          <div className="metrics">
            {metrics.map((metric, i) => (
              <Card key={i}>
                <CardContent>
                  <h3>{metric.title}</h3>
                  <p>{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="charts">
            <Card>
              <CardContent>
                <h3>Total Leads</h3>
                <Line data={dataForTotalLeads} />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3>Leads By Budget</h3>
                <Bar data={dataForLeadsByBudget} />
              </CardContent>
            </Card>
          </div>

          <div className="bottom-row">
            <Card>
              <CardContent>
                <h3>Leads Source</h3>
                <Chart
                  options={sourceChartOptions}
                  series={sourceSeries}
                  type="radialBar"
                  height="350"
                />
              </CardContent>
            </Card>

            {/* <Card>
              <CardContent>
                <h3>New Leads</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Event Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newLeads.map((lead, i) => (
                      <TableRow key={i}>
                        <TableCell>{lead.name}</TableCell>
                        <TableCell>{lead.category}</TableCell>
                        <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card> */}

<Card>
  <CardContent>
    <h3>New Leads</h3>
    <div className="table-container" style={{
      maxHeight: newLeads.length > 5 ? '350px' : 'auto',
      overflowY: newLeads.length > 5 ? 'auto' : 'visible'
    }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Event Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {newLeads.map((lead, i) => (
            <TableRow key={i}>
              <TableCell>{lead.name}</TableCell>
              <TableCell>{lead.category}</TableCell>
              <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>

          </div>
        </>
      )}
    </div>
  );
}
