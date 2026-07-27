import EventEmitter from "events"

class Broadcaster extends EventEmitter {
  send(event: string, data: any) {
    this.emit(event, data)
  }
}

const broadcaster = new Broadcaster()

export default broadcaster
