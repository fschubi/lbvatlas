/**
 * Controller für Ticket-Statistiken
 */
const logger = require('../utils/logger');

// Simulierte Ticket-Daten für Statistiken
const mockTickets = [
  { id: '1', status: 'Offen', priority: 3, category: 'Hardware' },
  { id: '2', status: 'In Bearbeitung', priority: 2, category: 'Zugriffsrechte' },
  { id: '3', status: 'Warten auf Antwort', priority: 1, category: 'Software' },
  { id: '4', status: 'Gelöst', priority: 2, category: 'Hardware' },
  { id: '5', status: 'In Bearbeitung', priority: 3, category: 'Netzwerk' }
];

// Einfacher Controller für Ticket-Statistiken
const getTicketStats = (req, res) => {
  try {
    // Berechne Statistiken
    const totalTickets = mockTickets.length;
    const openTickets = mockTickets.filter(t => t.status === 'Offen').length;
    const inProgressTickets = mockTickets.filter(t => t.status === 'In Bearbeitung').length;
    const waitingTickets = mockTickets.filter(t => t.status === 'Warten auf Antwort').length;
    const solvedTickets = mockTickets.filter(t => t.status === 'Gelöst').length;
    const closedTickets = mockTickets.filter(t => t.status === 'Geschlossen').length;

    const highPriorityTickets = mockTickets.filter(t => t.priority === 3).length;
    const mediumPriorityTickets = mockTickets.filter(t => t.priority === 2).length;
    const lowPriorityTickets = mockTickets.filter(t => t.priority === 1).length;

    // Berechne Kategorie-Verteilung
    const categories = {};
    mockTickets.forEach(ticket => {
      if (!categories[ticket.category]) {
        categories[ticket.category] = 1;
      } else {
        categories[ticket.category]++;
      }
    });

    res.json({
      total: totalTickets,
      by_status: {
        open: openTickets,
        in_progress: inProgressTickets,
        waiting: waitingTickets,
        solved: solvedTickets,
        closed: closedTickets
      },
      by_priority: {
        high: highPriorityTickets,
        medium: mediumPriorityTickets,
        low: lowPriorityTickets
      },
      by_category: categories
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Ticket-Statistiken:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Ticket-Statistiken' });
  }
};

module.exports = { getTicketStats };
