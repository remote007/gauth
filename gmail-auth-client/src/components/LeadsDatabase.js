import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Calendar, Trash2, MessageCircle, Phone } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./LeadsDatabase.css";

const Button = ({ icon, onClick, variant = "icon", children }) => (
  <button className={`btn ${variant}`} onClick={onClick}>
    {icon && <span className="icon">{icon}</span>}
    {children}
  </button>
);

const Checkbox = () => <input type="checkbox" />;

export default function LeadsDatabase() {
  const [leads, setLeads] = useState([]);
  const [selectedDate, setSelectedDate] = useState({});
  const [visibleId, setVisibleId] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const iconRefs = useRef({});
  const datePickerRef = useRef(null);

  useEffect(() => {
    axios.get("http://localhost:8083/leads")
      .then((res) => {
        const fetchedLeads = res.data.leads;
        setLeads(fetchedLeads);
        
        // Initialize the selectedDate state with existing dates
        const dates = {};
        fetchedLeads.forEach(lead => {
          const id = lead._id || lead.id;
          if (lead.date) {
            dates[id] = new Date(lead.date);
          }
        });
        setSelectedDate(dates);
      })
      .catch((err) => {
        console.error("Failed to fetch leads:", err);
      });
  }, []);

  const toggleDatePicker = (id) => {
    if (visibleId === id) {
      setVisibleId(null);
      return;
    }
    const rect = iconRefs.current[id]?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setVisibleId(id);
    }
  };

  const handleDateChange = (date, id) => {
    // Update local state first
    setSelectedDate(prev => {
      const newDates = { ...prev, [id]: date };
      return newDates;
    });
    
    // Close the date picker
    setVisibleId(null);
    
    // Update the backend
    axios.put(`http://localhost:8083/leads/${id}/date`, { date: date.toISOString() })
      .then(() => {
        // Update the leads array in state
        setLeads(prevLeads => 
          prevLeads.map(lead => {
            if ((lead._id === id) || (lead.id === id)) {
              return { ...lead, date: date.toISOString() };
            }
            return lead;
          })
        );
        console.log('Date updated successfully');
      })
      .catch((err) => {
        console.error("Failed to update date:", err);
      });
  };

  const handleStatusChange = (e, leadId) => {
    const updatedStatus = e.target.value;
    // Update the database with the new status
    axios.put(`http://localhost:8083/leads/${leadId}/status`, { status: updatedStatus })
      .then(() => {
        console.log('Status updated successfully');
        // Update the leads array with the new status
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead._id === leadId ? { ...lead, status: updatedStatus } : lead
          )
        );
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
      });
  };

  const handleDelete = (leadId) => {
    // Delete the lead from the database
    axios.delete(`http://localhost:8083/leads/${leadId}`)
      .then(() => {
        setLeads((prevLeads) => prevLeads.filter(lead => lead._id !== leadId));
        console.log('Lead deleted successfully');
      })
      .catch((err) => {
        console.error("Failed to delete lead:", err);
      });
  };

  const openWhatsApp = (phone) => {
    // Open WhatsApp chat with the phone number
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleBackClick = () => {
    window.location.href = "/dashboard";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (visibleId && datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        // Only close if we clicked outside the datepicker and not on the calendar icon
        if (!Object.values(iconRefs.current).some(ref => ref && ref.contains(e.target))) {
          setVisibleId(null);
        }
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visibleId]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  return (
    <div className="leads-database-container">
      <div className="header">
        <h1>Leads Database</h1>
        <div className="buttons">
          <Button onClick={handleBackClick}>Back to Dashboard</Button>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th><Checkbox /></th>
                <th>Name</th>
                <th>Category</th>
                <th>Event Date</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const leadId = lead._id || lead.id;
                return (
                  <tr key={leadId}>
                    <td><Checkbox /></td>
                    <td>{lead.name}</td>
                    <td>{lead.category}</td>
                    <td>
                      {formatDate(lead.date || lead.eventDate)}
                    </td>
                    <td>{lead.phone || "N/A"}</td>
                    <td>{lead.email}</td>
                    <td>
                      <div className="action-buttons">
                        <Button icon={<MessageCircle size={16} />} onClick={() => openWhatsApp(lead.phone)} />
                        <span ref={(el) => (iconRefs.current[leadId] = el)}>
                          <Button
                            icon={<Calendar size={16} />}
                            onClick={() => toggleDatePicker(leadId)}
                          />
                        </span>
                        <Button
                          icon={<Trash2 size={16} color="red" />}
                          onClick={() => handleDelete(leadId)}
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        value={lead.status || "New"}
                        onChange={(e) => handleStatusChange(e, leadId)}
                      >
                        <option value="New">New</option>
                        <option value="Converted">Converted</option>
                        <option value="Dropped">Dropped</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleId && (
          <div
            ref={datePickerRef}
            className="datepicker-popup"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              position: "absolute",
              zIndex: 9999,
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "4px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DatePicker
              selected={selectedDate[visibleId] || new Date()}
              onChange={(date) => handleDateChange(date, visibleId)}
              inline
              calendarClassName="custom-datepicker-calendar"
            />
          </div>
        )}
      </div>
    </div>
  );
}