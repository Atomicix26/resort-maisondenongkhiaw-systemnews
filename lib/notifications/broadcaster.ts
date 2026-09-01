import EventEmitter from "events"

interface BroadcasterData {
  [key: string]: unknown
}

class Broadcaster extends EventEmitter {
  send(event: string, data: BroadcasterData): void {
    this.emit(event, data)
  }
}

const broadcaster = new Broadcaster()

export default broadcaster
