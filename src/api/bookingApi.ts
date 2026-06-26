import apiClient from './axios';
import { Booking, CreateBookingPayload, ReviewPayload } from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_BOOKINGS, MOCK_EQUIPMENT } from '../mock/mockData';
import { mockDelay, generateMockId } from '../mock/mockHelpers';
import { getUser } from '../utils/storage';
import { daysBetween } from '../utils/formatters';

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const equipment = MOCK_EQUIPMENT.find((item) => item.id === payload.equipmentId);
    if (!equipment) throw new Error('Equipment not found');
    const days = daysBetween(payload.startDate, payload.endDate);
    const booking: Booking = {
      id: generateMockId('bk'),
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      farmerId: user?.id ?? 'unknown',
      farmerName: user?.fullName ?? 'You',
      ownerId: equipment.ownerId,
      ownerName: equipment.ownerName,
      startDate: payload.startDate,
      endDate: payload.endDate,
      totalCost: equipment.dailyRate * days,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
    };
    MOCK_BOOKINGS.unshift(booking);
    return mockDelay(booking);
  }
  const { data } = await apiClient.post<Booking>('/bookings', payload);
  return data;
}

export async function getMyBookings(): Promise<Booking[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const mine = MOCK_BOOKINGS.filter((b) => b.farmerId === user?.id);
    return mockDelay(mine);
  }
  const { data } = await apiClient.get<Booking[]>('/bookings/mine');
  return data;
}

export async function getIncomingBookings(): Promise<Booking[]> {
  if (USE_MOCK_DATA) {
    const user = await getUser();
    const incoming = MOCK_BOOKINGS.filter((b) => b.ownerId === user?.id);
    return mockDelay(incoming);
  }
  const { data } = await apiClient.get<Booking[]>('/bookings/incoming');
  return data;
}

function updateBookingStatus(bookingId: string, status: Booking['status']): Booking {
  const index = MOCK_BOOKINGS.findIndex((b) => b.id === bookingId);
  if (index === -1) throw new Error('Booking not found');
  const paymentStatus = status === 'CANCELLED' ? 'REFUNDED' : MOCK_BOOKINGS[index].paymentStatus;
  MOCK_BOOKINGS[index] = { ...MOCK_BOOKINGS[index], status, paymentStatus };
  return MOCK_BOOKINGS[index];
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  if (USE_MOCK_DATA) {
    return mockDelay(updateBookingStatus(bookingId, 'CONFIRMED'));
  }
  const { data } = await apiClient.patch<Booking>(`/bookings/${bookingId}/confirm`);
  return data;
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  if (USE_MOCK_DATA) {
    return mockDelay(updateBookingStatus(bookingId, 'CANCELLED'));
  }
  const { data } = await apiClient.patch<Booking>(`/bookings/${bookingId}/cancel`);
  return data;
}

export async function completeBooking(bookingId: string): Promise<Booking> {
  if (USE_MOCK_DATA) {
    return mockDelay(updateBookingStatus(bookingId, 'COMPLETED'));
  }
  const { data } = await apiClient.patch<Booking>(`/bookings/${bookingId}/complete`);
  return data;
}

export async function submitReview(payload: ReviewPayload): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.post('/bookings/reviews', payload);
}
