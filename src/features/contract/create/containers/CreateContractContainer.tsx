import { BasicContent } from "#src/components/index.js";
import { ProCard } from "@ant-design/pro-components";
import { Col, Row } from "antd";
import CreateContractMasterForm from "../components/forms/CreateContractMasterForm";

function CreateContractContainer() {
	return (
		<>
			<BasicContent>
				<Row gutter={10} justify="space-between">

					<Col span={18}>
						<ProCard>
							<CreateContractMasterForm />
						</ProCard>
					</Col>
					<Col span={6} className="space-y-4">
						<Row>
							<ProCard>
								خلاصه قرارداد
							</ProCard>
						</Row>
						<Row>
							<ProCard>
								قرارداد های موجود
							</ProCard>
						</Row>
					</Col>
				</Row>
			</BasicContent>
		</>
	);
}

export default CreateContractContainer;
