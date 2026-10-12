import Catalog from '../../components/Catalog'
import { Crumb } from '../../ui'

export default function EquipmentList() {
  return <><Crumb>Equipment List</Crumb><h1>Equipment list</h1>
    <p className="sub">Browse equipment you can borrow.</p><Catalog mode="view" /></>
}
