import { ProCard } from "#node_modules/@ant-design/pro-components/es";
import { BasicContent } from "#src/components/index.js";
import { Col, Row } from "antd";
import React from "react";

function CreateContractContainer() {
	return (
		<>
			<BasicContent>
				<Col span={18}>
					<ProCard>
						c
					</ProCard>
				</Col>
				<Col span={6}>
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
			</BasicContent>
		</>
	);
}

export default CreateContractContainer;
