export interface BoITAuthToken {
  customerId: string
  token: string
}

export interface BoITResourceCategory {
  id: number
  Name: string
  IconId: number
}

export interface BoITCustomer {
  customerId: string
  resources: number[]
}

export interface BoITBooking {
  id: number
  customerId: string
  date: string
  resourceId: number
  timeSlotIndex: number
  isReleased: boolean
  isUsed: boolean
  isCancellable: boolean
}

export interface BoITResourceGroup {
  id: number
  name: string
  categoryId: number
  locationId: number
  slotConfigId: number
}

export interface BoITLocation {
  id: number
  name: string
}

export interface BoITTimeSlot {
  StartTime: string
  StopTime: string
  duration: number
}

export interface BoITTimeSlotConfiguration {
  id: number
  slots: BoITTimeSlot[]
}
