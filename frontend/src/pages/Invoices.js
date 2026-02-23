import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Receipt, 
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  X
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../lib/utils';
import { jsPDF } from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Invoices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [creating, setCreating] = useState(false);
  
  // Create invoice form
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [invoiceItems, setInvoiceItems] = useState([{ description: 'Consultation Fee', amount: 500 }]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, appointmentsRes] = await Promise.all([
        axios.get(`${API}/invoices`, { withCredentials: true }),
        axios.get(`${API}/appointments?status=completed`, { withCredentials: true })
      ]);
      setInvoices(invoicesRes.data);
      // Filter appointments without invoices
      const appointmentsWithoutInvoice = appointmentsRes.data.filter(
        apt => !apt.invoice_id && apt.status === 'completed'
      );
      setAppointments(appointmentsWithoutInvoice);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedAppointment || invoiceItems.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setCreating(true);
    try {
      const totalAmount = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      await axios.post(
        `${API}/invoices`,
        {
          appointment_id: selectedAppointment,
          items: invoiceItems,
          total_amount: totalAmount
        },
        { withCredentials: true }
      );
      toast.success('Invoice created successfully');
      setShowCreateDialog(false);
      setSelectedAppointment('');
      setInvoiceItems([{ description: 'Consultation Fee', amount: 500 }]);
      fetchData();
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      await axios.put(
        `${API}/invoices/${invoiceId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(`Invoice marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}`, { withCredentials: true });
      setSelectedInvoice(res.data);
      setShowDetailDialog(true);
    } catch (error) {
      toast.error('Failed to load invoice');
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedInvoice) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 118, 110); // teal-700
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VEDANTH CLINIC', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Tax Invoice', pageWidth / 2, 30, { align: 'center' });
    
    // Invoice meta
    let y = 55;
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(9);
    doc.text('INVOICE NUMBER', 20, y);
    doc.text('DATE', pageWidth - 60, y);
    y += 6;
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedInvoice.invoice_id.toUpperCase(), 20, y);
    doc.text(formatDate(selectedInvoice.generated_at), pageWidth - 60, y);
    
    // Status badge
    y += 8;
    const statusColors = {
      paid: [5, 150, 105],
      pending: [217, 119, 6],
      waived: [100, 116, 139]
    };
    const [r, g, b] = statusColors[selectedInvoice.status] || statusColors.pending;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(selectedInvoice.status.toUpperCase(), 20, y);

    // Patient info
    y += 14;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('BILL TO', 20, y);
    y += 6;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedInvoice.patient?.name || 'N/A', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    if (selectedInvoice.patient?.email) doc.text(selectedInvoice.patient.email, 20, y);
    y += 5;
    if (selectedInvoice.patient?.phone) doc.text(selectedInvoice.patient.phone, 20, y);
    
    // Doctor info (if available)
    if (selectedInvoice.doctor) {
      const doctorY = 83;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text('ATTENDING DOCTOR', pageWidth - 60, doctorY);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedInvoice.doctor.name || '', pageWidth - 60, doctorY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      if (selectedInvoice.doctor.specialization) {
        doc.text(selectedInvoice.doctor.specialization, pageWidth - 60, doctorY + 12);
      }
    }
    
    // Table header
    y += 16;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, y - 4, pageWidth - 40, 10, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 25, y + 2);
    doc.text('AMOUNT', pageWidth - 45, y + 2, { align: 'right' });
    
    // Table rows
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    
    selectedInvoice.items.forEach((item) => {
      doc.text(item.description, 25, y);
      doc.text(`Rs. ${Number(item.amount).toLocaleString()}`, pageWidth - 45, y, { align: 'right' });
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
    });
    
    // Total
    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(pageWidth / 2, y - 4, pageWidth / 2 - 20, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', pageWidth / 2 + 10, y + 4);
    doc.setTextColor(15, 118, 110);
    doc.text(`Rs. ${Number(selectedInvoice.total_amount).toLocaleString()}`, pageWidth - 45, y + 4, { align: 'right' });
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Vedanth Clinic - Thank you for choosing us for your healthcare needs.', pageWidth / 2, footerY, { align: 'center' });
    
    doc.save(`vedanth-invoice-${selectedInvoice.invoice_id}.pdf`);
    toast.success('Invoice PDF downloaded');
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', amount: 0 }]);
  };

  const removeInvoiceItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setInvoiceItems(updated);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', variant: 'warning' },
      paid: { label: 'Paid', variant: 'success' },
      waived: { label: 'Waived', variant: 'secondary' },
    };
    const { label, variant } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <DashboardLayout>
      <Header 
        title="Invoices" 
        subtitle={user?.role === 'patient' ? 'View your invoices' : 'Manage billing and invoices'}
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="invoices-page">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-invoices"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
              {user?.role === 'staff' && appointments.length > 0 && (
                <Button 
                  className="bg-teal-700 hover:bg-teal-800"
                  onClick={() => setShowCreateDialog(true)}
                  data-testid="create-invoice-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No invoices found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.invoice_id} data-testid={`invoice-row-${invoice.invoice_id}`}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoice_id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell>{invoice.patient?.name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(invoice.generated_at)}</TableCell>
                      <TableCell className="font-medium tabular-nums">
                        ₹{invoice.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewInvoice(invoice.invoice_id)}
                            data-testid={`view-invoice-${invoice.invoice_id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.role === 'staff' && invoice.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-emerald-600"
                                onClick={() => handleStatusUpdate(invoice.invoice_id, 'paid')}
                                data-testid={`mark-paid-${invoice.invoice_id}`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Invoice Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Generate an invoice for a completed appointment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Select Appointment
                </label>
                <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                  <SelectTrigger data-testid="select-appointment">
                    <SelectValue placeholder="Select an appointment" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((apt) => (
                      <SelectItem key={apt.appointment_id} value={apt.appointment_id}>
                        {apt.patient_name} - {formatDate(apt.date)} ({apt.doctor_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Invoice Items</label>
                  <Button variant="ghost" size="sm" onClick={addInvoiceItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => updateInvoiceItem(index, 'amount', e.target.value)}
                        className="w-24"
                      />
                      {invoiceItems.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeInvoiceItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-xl font-bold tabular-nums">
                    ₹{invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleCreateInvoice}
                disabled={creating}
                data-testid="confirm-create-invoice"
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">Invoice Number</p>
                    <p className="font-mono font-medium">{selectedInvoice.invoice_id.toUpperCase()}</p>
                  </div>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Patient</p>
                    <p className="font-medium">{selectedInvoice.patient?.name}</p>
                    <p className="text-sm text-slate-500">{selectedInvoice.patient?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="font-medium">{formatDate(selectedInvoice.generated_at)}</p>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Description</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 text-right tabular-nums">₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t">
                      <tr>
                        <td className="px-4 py-2 font-medium">Total</td>
                        <td className="px-4 py-2 text-right font-bold tabular-nums">
                          ₹{selectedInvoice.total_amount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleDownloadPDF}
                data-testid="download-invoice-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
